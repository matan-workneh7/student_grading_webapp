defmodule GradeApi.GradingTest do
  use ExUnit.Case, async: true
  alias GradeApi.Grading

  test "basic average and thresholds" do
    assert {:ok, %{total: 240, average: 80.0, letter: "B"}} =
             Grading.summarize([%{mark: 80}, %{mark: 90}, %{mark: 70}])

    assert {:ok, %{average: 100.0, letter: "A"}} = Grading.summarize([%{mark: 100}])
    assert Grading.letter_for(90) == "A"
    assert Grading.letter_for(80) == "B"
    assert Grading.letter_for(50) == "E"
  end

  test "mark validation rejects invalid values" do
    assert {:error, :invalid_mark} = Grading.validate_mark(-1)
    assert {:error, :invalid_mark} = Grading.validate_mark(101)
    assert {:error, :invalid_mark} = Grading.validate_mark("abc")
  end

  test "weights and unrounded grade boundaries are preserved" do
    assert {:ok, %{average: 82.5, letter: "B"}} =
             Grading.summarize([%{mark: 90, weight: 3}, %{mark: 60, weight: 1}])

    assert Grading.letter_for(89.996) == "B"
  end
end
