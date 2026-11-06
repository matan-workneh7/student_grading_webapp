alias GradeApi.{Repo, Student, Subject, Grade, GradingScale}

unless Repo.exists?(GradingScale) do
  Repo.insert!(%GradingScale{scale: Jason.encode!(GradeApi.Grading.default_scale())})
end

subjects = [
  {"Mathematics", "MATH", 4},
  {"English", "ENG", 3},
  {"Science", "SCI", 4},
  {"History", "HIST", 2},
  {"Geography", "GEO", 2},
  {"ICT", "ICT", 3}
]

subject_rows =
  Enum.map(subjects, fn {name, code, credit_hours} ->
    changeset =
      Subject.changeset(%Subject{}, %{name: name, code: code, credit_hours: credit_hours})

    Repo.insert!(changeset,
      on_conflict: {:replace, [:name, :credit_hours]},
      conflict_target: :code,
      returning: true
    )
  end)

names = [
  {"Amina Hassan", "STU001", "A"},
  {"Brian Otieno", "STU002", "A"},
  {"Chao Wang", "STU003", "B"},
  {"Diana Kibet", "STU004", "B"},
  {"Ethan Mwangi", "STU005", "A"},
  {"Farah Ali", "STU006", "C"},
  {"Grace Njeri", "STU007", "C"},
  {"Hassan Noor", "STU008", "B"},
  {"Imani Wanjiku", "STU009", "A"},
  {"Joseph Maina", "STU010", "C"},
  {"Kendi Achieng", "STU011", "B"},
  {"Liam Kamau", "STU012", "A"}
]

Enum.with_index(names, 1)
|> Enum.each(fn {{name, number, section}, index} ->
  student =
    Repo.insert!(
      Student.changeset(%Student{}, %{name: name, student_number: number, section: section}),
      on_conflict: {:replace, [:name, :section]},
      conflict_target: :student_number,
      returning: true
    )

  subject_rows
  |> Enum.with_index()
  |> Enum.each(fn {subject, subject_index} ->
    mark = 54 + rem(index * 7 + subject_index * 5, 47)

    Repo.insert!(
      Grade.changeset(%Grade{}, %{student_id: student.id, subject_id: subject.id, mark: mark}),
      on_conflict: {:replace, [:mark]},
      conflict_target: [:student_id, :subject_id]
    )
  end)
end)
