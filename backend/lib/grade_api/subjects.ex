defmodule GradeApi.Subjects do
  import Ecto.Query
  alias GradeApi.{Repo, Subject}
  def list, do: Repo.all(from s in Subject, order_by: s.code)
  def get(id), do: Repo.get(Subject, id)
  def create(attrs), do: %Subject{} |> Subject.changeset(attrs) |> Repo.insert()
  def update(s, attrs), do: s |> Subject.changeset(attrs) |> Repo.update()
  def delete(s), do: Repo.delete(s)
end
