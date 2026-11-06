defmodule GradeApi.Students do
  import Ecto.Query
  alias GradeApi.{Repo, Student, Grade}

  def list(params \\ %{}) do
    page = int(params["page"], 1)
    per_page = min(int(params["per_page"], 20), 100)
    search = params["search"] || ""
    sort = params["sort"] || "inserted_at"
    desc = String.starts_with?(sort, "-")
    field = String.trim_leading(sort, "-")

    field =
      if field in ["name", "student_number", "inserted_at"],
        do: String.to_existing_atom(field),
        else: :inserted_at

    query = from(s in Student)

    query =
      if search == "",
        do: query,
        else:
          from(s in query,
            where:
              fragment("lower(?) LIKE ?", s.name, ^("%" <> String.downcase(search) <> "%")) or
                fragment(
                  "lower(coalesce(?, '')) LIKE ?",
                  s.student_number,
                  ^("%" <> String.downcase(search) <> "%")
                )
          )

    total = Repo.aggregate(query, :count)
    ordering = if desc, do: [desc: field], else: [asc: field]

    data =
      query
      |> order_by(^ordering)
      |> limit(^per_page)
      |> offset(^((page - 1) * per_page))
      |> Repo.all()

    {data, %{page: page, per_page: per_page, total: total}}
  end

  def get(id), do: Repo.get(Student, id)
  def create(attrs), do: %Student{} |> Student.changeset(attrs) |> Repo.insert()
  def update(student, attrs), do: student |> Student.changeset(attrs) |> Repo.update()
  def delete(student), do: Repo.delete(student)

  def result(id) do
    case Repo.get(Student, id) do
      nil ->
        {:error, :not_found}

      student ->
        {:ok, student, Repo.all(from g in Grade, where: g.student_id == ^id, preload: [:subject])}
    end
  end

  defp int(nil, default), do: default

  defp int(value, default) do
    case Integer.parse(to_string(value)) do
      {n, _} -> max(n, 1)
      _ -> default
    end
  end
end
