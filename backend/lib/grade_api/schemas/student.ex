defmodule GradeApi.Student do
  use Ecto.Schema
  import Ecto.Changeset

  schema "students" do
    field :name, :string
    field :student_number, :string
    field :section, :string
    has_many :grades, GradeApi.Grade, on_delete: :delete_all
    timestamps(type: :utc_datetime)
  end

  def changeset(student, attrs) do
    student
    |> cast(attrs, [:name, :student_number, :section])
    |> validate_required([:name])
    |> validate_change(:name, fn :name, name ->
      if String.trim(name) == "", do: [name: "can't be blank"], else: []
    end)
    |> update_change(:student_number, &blank_to_nil/1)
    |> update_change(:section, &blank_to_nil/1)
    |> unique_constraint(:student_number)
  end

  defp blank_to_nil(value) when is_binary(value),
    do: if(String.trim(value) == "", do: nil, else: value)

  defp blank_to_nil(value), do: value
end
