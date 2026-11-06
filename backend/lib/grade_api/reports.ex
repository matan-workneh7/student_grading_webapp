defmodule GradeApi.Reports do
  import Ecto.Query
  alias GradeApi.{Repo, Student, Grade, Subject}

  def report(id) do
    with %Student{} = student <- Repo.get(Student, id) do
      rows =
        Repo.all(
          from g in Grade,
            where: g.student_id == ^id,
            join: s in assoc(g, :subject),
            preload: [subject: s],
            order_by: s.code
        )

      if rows == [], do: {:error, :no_marks}, else: build_report(student, rows)
    else
      nil -> {:error, :not_found}
    end
  end

  def stats do
    students = Repo.all(Student)

    reports =
      Enum.flat_map(students, fn student ->
        case report(student.id) do
          {:ok, value} -> [value]
          _ -> []
        end
      end)

    averages = Enum.map(reports, & &1.average_raw)
    highest = Enum.max_by(reports, & &1.average_raw, fn -> nil end)
    lowest = Enum.min_by(reports, & &1.average_raw, fn -> nil end)

    per_subject =
      Repo.all(Subject)
      |> Enum.map(fn subject ->
        marks = Repo.all(from g in Grade, where: g.subject_id == ^subject.id, select: g.mark)

        %{
          subject: %{
            id: subject.id,
            name: subject.name,
            code: subject.code,
            credit_hours: subject.credit_hours
          },
          average:
            if(marks == [], do: 0.0, else: Float.round(Enum.sum(marks) / length(marks), 2)),
          highest: Enum.max(marks, fn -> 0.0 end),
          lowest: Enum.min(marks, fn -> 0.0 end)
        }
      end)

    distribution =
      Enum.reduce(["A", "B", "C", "D", "E", "F"], %{}, fn letter, acc ->
        Map.put(acc, letter, Enum.count(reports, &(&1.letter == letter)))
      end)

    %{
      student_count: length(students),
      class_average:
        if(averages == [], do: 0.0, else: Float.round(Enum.sum(averages) / length(averages), 2)),
      highest: student_average(highest),
      lowest: student_average(lowest),
      distribution: distribution,
      per_subject: per_subject
    }
  end

  def export_csv do
    subjects = Repo.all(from s in Subject, order_by: s.code)
    students = Repo.all(from s in Student, order_by: s.name)

    headers =
      ["name", "student_number", "section"] ++
        Enum.map(subjects, & &1.code) ++ ["total", "average", "letter", "rank"]

    data =
      Enum.map(students, fn student ->
        grades =
          Repo.all(
            from g in Grade,
              where: g.student_id == ^student.id,
              join: s in assoc(g, :subject),
              preload: [subject: s]
          )

        report = if grades == [], do: nil, else: elem(build_report(student, grades), 1)

        [student.name, student.student_number, student.section] ++
          Enum.map(subjects, fn sub ->
            case Enum.find(grades, &(&1.subject_id == sub.id)) do
              nil -> ""
              grade -> grade.mark
            end
          end) ++
          [
            if(report, do: report.total, else: ""),
            if(report, do: report.average, else: ""),
            if(report, do: report.letter, else: ""),
            if(report, do: report.rank, else: "")
          ]
      end)

    ([headers] ++ data) |> Enum.map_join("\r\n", &csv_row/1)
  end

  defp build_report(student, grades) do
    scale = GradeApi.Scale.get()

    entries =
      Enum.map(grades, fn grade ->
        %{
          subject: %{
            id: grade.subject.id,
            name: grade.subject.name,
            code: grade.subject.code,
            credit_hours: grade.subject.credit_hours
          },
          mark: grade.mark,
          weight: grade.subject.credit_hours,
          letter: GradeApi.Grading.letter_for(grade.mark, GradeApi.Grading.normalize_scale(scale))
        }
      end)

    raw_entries = Enum.map(entries, &%{mark: &1.mark, weight: &1.weight})
    {:ok, summary} = GradeApi.Grading.summarize(raw_entries, scale)

    all =
      Repo.all(Student)
      |> Enum.flat_map(fn other ->
        if other.id == student.id do
          []
        else
          case report_simple(other.id) do
            nil -> []
            value -> [value]
          end
        end
      end)

    rank = 1 + Enum.count(all, &(&1 > summary.average_raw))

    {:ok,
     Map.merge(summary, %{
       student: student_payload(student),
       entries: entries,
       rank: rank,
       class_size: length(Repo.all(Student))
     })}
  end

  defp report_simple(id) do
    grades =
      Repo.all(
        from g in Grade,
          where: g.student_id == ^id,
          join: s in assoc(g, :subject),
          select: {g.mark, s.credit_hours}
      )

    case grades do
      [] ->
        nil

      _ ->
        Enum.sum(Enum.map(grades, fn {m, w} -> m * w end)) /
          Enum.sum(Enum.map(grades, &elem(&1, 1)))
    end
  end

  defp student_average(nil), do: nil
  defp student_average(report), do: %{student: report.student, average: report.average}

  defp student_payload(student) do
    %{id: student.id, name: student.name, inserted_at: student.inserted_at}
    |> Map.merge(
      if(student.student_number, do: %{student_number: student.student_number}, else: %{})
    )
    |> Map.merge(if(student.section, do: %{section: student.section}, else: %{}))
  end

  defp csv_row(row),
    do:
      Enum.map_join(row, ",", fn value ->
        value |> to_string() |> String.replace("\"", "\"\"") |> then(&"\"#{&1}\"")
      end)
end
