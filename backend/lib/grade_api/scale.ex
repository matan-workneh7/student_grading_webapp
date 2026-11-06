defmodule GradeApi.Scale do
  alias GradeApi.{Repo, GradingScale}

  def get do
    case Repo.one(GradingScale) do
      nil -> GradeApi.Grading.default_scale()
      row -> Jason.decode!(row.scale)
    end
  end

  def update(scale) do
    if GradingScale.valid_scale?(scale) do
      row = Repo.one(GradingScale) || %GradingScale{}
      Repo.insert_or_update(Ecto.Changeset.change(row, scale: Jason.encode!(scale)))
    else
      {:error,
       Ecto.Changeset.add_error(Ecto.Changeset.change(%GradingScale{}), :scale, "is invalid")}
    end
  end
end
