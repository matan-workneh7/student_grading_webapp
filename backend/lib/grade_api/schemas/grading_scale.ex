defmodule GradeApi.GradingScale do
  use Ecto.Schema
  import Ecto.Changeset

  schema "grading_scales" do
    field :scale, :string
    timestamps(type: :utc_datetime)
  end

  def changeset(row, attrs) do
    scale = Map.get(attrs, "scale", Map.get(attrs, :scale))
    changeset = cast(row, %{scale_json: scale}, [])

    if valid_scale?(scale),
      do: change(row, scale: Jason.encode!(scale)),
      else:
        add_error(changeset, :scale, "must be sorted descending, end at 0, and contain letters")
  end

  def valid_scale?(scale) when is_list(scale) and scale != [] do
    mins = Enum.map(scale, &Map.get(&1, "min", Map.get(&1, :min)))
    letters = Enum.map(scale, &Map.get(&1, "letter", Map.get(&1, :letter)))

    Enum.all?(mins, &is_number/1) and List.last(mins) == 0 and mins == Enum.sort(mins, :desc) and
      Enum.all?(letters, &(is_binary(&1) and String.trim(&1) != ""))
  end

  def valid_scale?(_), do: false
end
