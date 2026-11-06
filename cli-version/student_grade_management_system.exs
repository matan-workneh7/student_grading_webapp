defmodule StudentGradeManagementSystem do
  def main do
    IO.puts("=== Student Grade Management System ===")
    process_student()
  end

  defp process_student do
    name = get_non_empty_text("Enter student name: ")
    count = get_positive_integer("Enter number of subjects: ")
    subjects = collect_subjects(1, count, [])
    results = calculate_results(subjects)
    display_results(name, subjects, results)

    if ask_another() do
      IO.puts("")
      process_student()
    else
      IO.puts("Goodbye.")
    end
  end

  defp read_line(prompt) do
    case IO.gets(prompt) do
      :eof -> System.halt(0)
      {:error, _} -> System.halt(1)
      data -> String.trim(data)
    end
  end

  defp get_non_empty_text(prompt) do
    case read_line(prompt) do
      "" ->
        IO.puts("Error: this field cannot be empty.")
        get_non_empty_text(prompt)

      text ->
        text
    end
  end

  defp get_positive_integer(prompt) do
    case Integer.parse(read_line(prompt)) do
      {number, ""} when number > 0 ->
        number

      _ ->
        IO.puts("Error: enter a whole number greater than zero.")
        get_positive_integer(prompt)
    end
  end

  defp collect_subjects(index, count, acc) when index > count, do: Enum.reverse(acc)

  defp collect_subjects(index, count, acc) do
    subject = get_non_empty_text("Subject #{index} name: ")
    mark = get_valid_mark("Mark for #{subject} (0-100): ")
    collect_subjects(index + 1, count, [{subject, mark} | acc])
  end

  defp get_valid_mark(prompt) do
    case Float.parse(read_line(prompt)) do
      {mark, ""} when mark >= 0 and mark <= 100 ->
        mark

      {_, ""} ->
        IO.puts("Error: the mark must be between 0 and 100.")
        get_valid_mark(prompt)

      _ ->
        IO.puts("Error: the mark must be a number.")
        get_valid_mark(prompt)
    end
  end

  defp calculate_results(subjects) do
    total = Enum.reduce(subjects, 0.0, fn {_subject, mark}, acc -> acc + mark end)
    average = total / length(subjects)
    {total, average, get_grade(average)}
  end

  defp get_grade(average) when average >= 90, do: "A"
  defp get_grade(average) when average >= 80, do: "B"
  defp get_grade(average) when average >= 70, do: "C"
  defp get_grade(average) when average >= 60, do: "D"
  defp get_grade(average) when average >= 50, do: "E"
  defp get_grade(_average), do: "F"

  defp format_number(value), do: :erlang.float_to_binary(value, decimals: 2)

  defp display_results(name, subjects, {total, average, grade}) do
    IO.puts("")
    IO.puts("---------- Result Summary ----------")
    IO.puts("Student: #{name}")
    IO.puts("")

    Enum.each(subjects, fn {subject, mark} ->
      IO.puts("  #{String.pad_trailing(subject, 25)} #{format_number(mark)}")
    end)

    IO.puts("")
    IO.puts("Total:   #{format_number(total)}")
    IO.puts("Average: #{format_number(average)}")
    IO.puts("Grade:   #{grade}")
    IO.puts("------------------------------------")
  end

  defp ask_another do
    answer = read_line("Process another student? (y/yes to continue): ")
    String.downcase(answer) in ["y", "yes"]
  end
end

StudentGradeManagementSystem.main()
