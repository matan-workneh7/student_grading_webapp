defmodule GradeApi.Grading do
  def validate_mark(mark) when is_number(mark) and mark >= 0 and mark <= 100,
    do: {:ok, mark * 1.0}

  def validate_mark(_), do: {:error, :invalid_mark}

  def weighted_average(entries) when is_list(entries) and entries != [] do
    {weighted, weights} =
      Enum.reduce(entries, {0.0, 0.0}, fn entry, {sum, weight_sum} ->
        weight = entry[:weight] || 1
        {sum + entry[:mark] * weight, weight_sum + weight}
      end)

    if weights > 0, do: {:ok, weighted / weights}, else: {:error, :invalid_weight}
  end

  def weighted_average(_), do: {:error, :no_marks}

  def letter_for(
        average,
        scale \\ [{90, "A"}, {80, "B"}, {70, "C"}, {60, "D"}, {50, "E"}, {0, "F"}]
      )

  def letter_for(average, [{minimum, letter} | _]) when average >= minimum, do: letter
  def letter_for(average, [_ | rest]), do: letter_for(average, rest)
  def letter_for(_, []), do: "F"

  def default_scale,
    do: [
      %{"min" => 90, "letter" => "A"},
      %{"min" => 80, "letter" => "B"},
      %{"min" => 70, "letter" => "C"},
      %{"min" => 60, "letter" => "D"},
      %{"min" => 50, "letter" => "E"},
      %{"min" => 0, "letter" => "F"}
    ]

  def summarize(entries, scale \\ default_scale()) do
    with {:ok, average_raw} <- weighted_average(entries) do
      total = Enum.reduce(entries, 0, &(&1.mark + &2))

      weighted_total =
        Enum.reduce(entries, 0, fn entry, acc -> acc + entry.mark * (entry[:weight] || 1) end)

      {:ok,
       %{
         total: total,
         weighted_total: weighted_total,
         average: Float.round(average_raw, 2),
         average_raw: average_raw,
         letter: letter_for(average_raw, normalize_scale(scale))
       }}
    end
  end

  def normalize_scale(scale) do
    Enum.map(scale, fn item -> {item["min"] || item[:min], item["letter"] || item[:letter]} end)
  end
end
