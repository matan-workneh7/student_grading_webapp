defmodule GradeApi.Grade do
  use Ecto.Schema
  import Ecto.Changeset

  schema "grades" do
    field :mark, :float
    belongs_to :student, GradeApi.Student
    belongs_to :subject, GradeApi.Subject
    timestamps(type: :utc_datetime)
  end

  def changeset(grade, attrs) do
    grade
    |> cast(attrs, [:mark, :student_id, :subject_id])
    |> validate_required([:mark, :student_id, :subject_id])
    |> validate_number(:mark, greater_than_or_equal_to: 0, less_than_or_equal_to: 100)
    |> foreign_key_constraint(:student_id)
    |> foreign_key_constraint(:subject_id)
    |> unique_constraint([:student_id, :subject_id])
  end
end
