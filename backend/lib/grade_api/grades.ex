defmodule GradeApi.Grades do
  alias GradeApi.{Repo, Grade, Student, Subject}

  def upsert(student_id, entries) do
    with %Student{} <- Repo.get(Student, student_id) do
      results =
        Enum.map(entries, fn entry ->
          with {:ok, subject_id} <- parse_id(entry["subject_id"]),
               %Subject{} <- Repo.get(Subject, subject_id),
               {:ok, mark} <- GradeApi.Grading.validate_mark(entry["mark"]) do
            existing = Repo.get_by(Grade, student_id: student_id, subject_id: subject_id)

            (existing || %Grade{})
            |> Grade.changeset(%{student_id: student_id, subject_id: subject_id, mark: mark})
            |> Repo.insert_or_update()
          else
            _ -> {:error, %{mark: ["is invalid or subject was not found"]}}
          end
        end)

      case Enum.find(results, &match?({:error, _}, &1)) do
        nil -> {:ok, Enum.map(results, fn {:ok, grade} -> grade end)}
        {:error, error} -> {:error, error}
      end
    else
      nil -> {:error, :not_found}
    end
  end

  def delete(student_id, subject_id) do
    case Repo.get_by(Grade, student_id: student_id, subject_id: subject_id) do
      nil -> {:error, :not_found}
      grade -> Repo.delete(grade)
    end
  end

  defp parse_id(id) when is_integer(id), do: {:ok, id}

  defp parse_id(id) when is_binary(id) do
    case Integer.parse(id) do
      {n, ""} -> {:ok, n}
      _ -> :error
    end
  end

  defp parse_id(_), do: :error
end
