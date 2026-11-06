defmodule GradeApiWeb.ApiController do
  use GradeApiWeb, :controller
  alias GradeApi.{Students, Subjects, Grades, Reports, Scale, Student, Subject}

  def health(conn, _), do: json(conn, %{status: "ok"})

  def students(conn, params) do
    {rows, meta} = Students.list(params)
    json(conn, %{data: Enum.map(rows, &student_json/1), meta: meta})
  end

  def create_student(conn, params), do: create(conn, Students.create(params), &student_json/1)

  def student(conn, %{"id" => id}) do
    case Students.get(id) do
      nil -> not_found(conn)
      value -> json(conn, %{data: student_json(value)})
    end
  end

  def update_student(conn, %{"id" => id} = params) do
    case Students.get(id) do
      nil -> not_found(conn)
      value -> update(conn, Students.update(value, Map.drop(params, ["id"])), &student_json/1)
    end
  end

  def delete_student(conn, %{"id" => id}) do
    case Students.get(id) do
      nil ->
        not_found(conn)

      value ->
        {:ok, _} = Students.delete(value)
        send_resp(conn, 204, "")
    end
  end

  def subjects(conn, _) do
    data = Enum.map(Subjects.list(), &subject_json/1)
    json(conn, %{data: data, meta: %{page: 1, per_page: length(data), total: length(data)}})
  end

  def create_subject(conn, params), do: create(conn, Subjects.create(params), &subject_json/1)

  def update_subject(conn, %{"id" => id} = params) do
    case Subjects.get(id) do
      nil -> not_found(conn)
      value -> update(conn, Subjects.update(value, Map.drop(params, ["id"])), &subject_json/1)
    end
  end

  def delete_subject(conn, %{"id" => id}) do
    case Subjects.get(id) do
      nil ->
        not_found(conn)

      value ->
        {:ok, _} = Subjects.delete(value)
        send_resp(conn, 204, "")
    end
  end

  def put_grades(conn, %{"id" => id, "grades" => entries}) when is_list(entries),
    do:
      create(
        conn,
        Grades.upsert(id, entries),
        &Enum.map(&1, fn g ->
          %{id: g.id, student_id: g.student_id, subject_id: g.subject_id, mark: g.mark}
        end)
      )

  def put_grades(conn, _), do: validation(conn, %{grades: ["is required"]})

  def delete_grade(conn, %{"id" => id, "subject_id" => subject_id}) do
    case Grades.delete(id, subject_id) do
      {:ok, _} -> send_resp(conn, 204, "")
      {:error, :not_found} -> not_found(conn)
    end
  end

  def report(conn, %{"id" => id}) do
    case Reports.report(id) do
      {:ok, report} -> json(conn, %{data: report})
      {:error, :not_found} -> not_found(conn)
      {:error, :no_marks} -> validation(conn, %{grades: ["at least one mark is required"]})
    end
  end

  def calculate(conn, %{"subjects" => subjects}) when is_list(subjects) do
    entries =
      Enum.map(subjects, fn subject ->
        %{mark: subject["mark"], weight: subject["weight"] || 1}
      end)

    case Enum.find(entries, &(not match?({:ok, _}, GradeApi.Grading.validate_mark(&1.mark)))) do
      nil ->
        case GradeApi.Grading.summarize(entries, Scale.get()) do
          {:ok, summary} ->
            output =
              Enum.map(subjects, fn sub ->
                %{
                  name: sub["name"],
                  mark: sub["mark"],
                  weight: sub["weight"] || 1,
                  letter:
                    GradeApi.Grading.letter_for(
                      sub["mark"],
                      GradeApi.Grading.normalize_scale(Scale.get())
                    )
                }
              end)

            json(conn, %{data: Map.put(summary, :entries, output)})

          _ ->
            validation(conn, %{subjects: ["at least one subject is required"]})
        end

      _ ->
        validation(conn, %{mark: ["must be a number between 0 and 100"]})
    end
  end

  def calculate(conn, _), do: validation(conn, %{subjects: ["is required"]})
  def scale(conn, _), do: json(conn, %{data: Scale.get()})

  def update_scale(conn, %{"scale" => value}) do
    case Scale.update(value) do
      {:ok, _} -> json(conn, %{data: value})
      {:error, cs} -> validation(conn, errors(cs))
    end
  end

  def update_scale(conn, _), do: validation(conn, %{scale: ["is required"]})
  def stats(conn, _), do: json(conn, %{data: Reports.stats()})

  def export(conn, _) do
    conn
    |> put_resp_content_type("text/csv")
    |> put_resp_header("content-disposition", "attachment; filename=students.csv")
    |> send_resp(200, Reports.export_csv())
  end

  defp create(conn, {:ok, value}, mapper),
    do: conn |> put_status(:created) |> json(%{data: mapper.(value)})

  defp create(conn, {:error, %Ecto.Changeset{} = cs}, _), do: validation(conn, errors(cs))
  defp create(conn, {:error, errors}, _), do: validation(conn, normalize_errors(errors))

  defp update(conn, {:ok, value}, mapper), do: json(conn, %{data: mapper.(value)})
  defp update(conn, {:error, %Ecto.Changeset{} = cs}, _), do: validation(conn, errors(cs))

  defp validation(conn, fields),
    do:
      conn
      |> put_status(422)
      |> json(%{
        error: %{code: "validation_failed", message: "Validation failed", fields: fields}
      })

  defp not_found(conn),
    do: conn |> put_status(404) |> json(%{error: %{code: "not_found", message: "Not found"}})

  defp student_json(%Student{} = s) do
    %{id: s.id, name: s.name, inserted_at: s.inserted_at}
    |> Map.merge(if(s.student_number, do: %{student_number: s.student_number}, else: %{}))
    |> Map.merge(if(s.section, do: %{section: s.section}, else: %{}))
  end

  defp subject_json(%Subject{} = s),
    do: %{id: s.id, name: s.name, code: s.code, credit_hours: s.credit_hours}

  defp errors(cs), do: Ecto.Changeset.traverse_errors(cs, fn {msg, _} -> msg end)
  defp normalize_errors(map) when is_map(map), do: map
  defp normalize_errors(_), do: %{base: ["is invalid"]}
end
