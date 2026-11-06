defmodule GradeApi.Subject do
  use Ecto.Schema
  import Ecto.Changeset

  schema "subjects" do
    field :name, :string
    field :code, :string
    field :credit_hours, :float, default: 1.0
    has_many :grades, GradeApi.Grade, on_delete: :delete_all
    timestamps(type: :utc_datetime)
  end

  def changeset(subject, attrs) do
    subject
    |> cast(attrs, [:name, :code, :credit_hours])
    |> validate_required([:name, :code, :credit_hours])
    |> validate_change(:name, fn :name, name ->
      if String.trim(name) == "", do: [name: "can't be blank"], else: []
    end)
    |> validate_number(:credit_hours, greater_than: 0)
    |> unique_constraint(:code)
  end
end
