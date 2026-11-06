defmodule GradeApi.Repo.Migrations.CreateGradingTables do
  use Ecto.Migration

  def change do
    create table(:students) do
      add :name, :string, null: false
      add :student_number, :string
      add :section, :string
      timestamps(type: :utc_datetime)
    end

    create unique_index(:students, [:student_number])

    create table(:subjects) do
      add :name, :string, null: false
      add :code, :string, null: false
      add :credit_hours, :float, null: false, default: 1.0
      timestamps(type: :utc_datetime)
    end

    create unique_index(:subjects, [:code])

    create table(:grades) do
      add :mark, :float, null: false
      add :student_id, references(:students, on_delete: :delete_all), null: false
      add :subject_id, references(:subjects, on_delete: :delete_all), null: false
      timestamps(type: :utc_datetime)
    end

    create unique_index(:grades, [:student_id, :subject_id])

    create table(:grading_scales) do
      add :scale, :text, null: false
      timestamps(type: :utc_datetime)
    end
  end
end
