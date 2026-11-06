defmodule GradeApiWeb.ApiControllerTest do
  use GradeApiWeb.ConnCase
  alias GradeApi.{Repo, Student, Subject}

  @base "/api/v1"

  test "health and basic subject and student routes", %{conn: conn} do
    assert %{"status" => "ok"} = get(conn, @base <> "/health") |> json_response(200)

    assert %{"data" => [], "meta" => %{"total" => 0}} =
             get(conn, @base <> "/subjects") |> json_response(200)

    student =
      post(conn, @base <> "/students", %{name: "Ada", student_number: "S-1"})
      |> json_response(201)

    id = student["data"]["id"]

    assert %{"data" => %{"name" => "Ada"}} =
             get(conn, @base <> "/students/#{id}") |> json_response(200)

    assert %{"data" => _} =
             patch(conn, @base <> "/students/#{id}", %{section: "A"}) |> json_response(200)

    assert %{"data" => [_], "meta" => %{"page" => 1}} =
             get(conn, @base <> "/students?page=1&per_page=1&search=ada") |> json_response(200)

    assert %{"data" => _} =
             post(conn, @base <> "/subjects", %{name: "Math", code: "M", credit_hours: 3})
             |> json_response(201)
  end

  test "validation, missing records and calculator", %{conn: conn} do
    invalid = post(conn, @base <> "/students", %{name: ""}) |> json_response(422)
    assert invalid["error"]["code"] == "validation_failed"

    assert %{"error" => %{"code" => "not_found"}} =
             get(conn, @base <> "/students/99999") |> json_response(404)

    result =
      post(conn, @base <> "/calculate", %{
        subjects: [%{name: "Math", mark: 90, weight: 3}, %{name: "Eng", mark: 60, weight: 1}]
      })
      |> json_response(200)

    assert result["data"]["average"] == 82.5
    assert result["data"]["letter"] == "B"
  end

  test "optional student fields are omitted and fractional subject weights are accepted", %{
    conn: conn
  } do
    student = post(conn, @base <> "/students", %{name: "Una"}) |> json_response(201)
    refute Map.has_key?(student["data"], "student_number")
    refute Map.has_key?(student["data"], "section")

    assert %{"data" => %{"credit_hours" => 1.5}} =
             post(conn, @base <> "/subjects", %{
               name: "Lab",
               code: "LAB",
               credit_hours: 1.5
             })
             |> json_response(201)
  end

  test "grades reports scale stats and CSV", %{conn: conn} do
    student = Repo.insert!(Student.changeset(%Student{}, %{name: "Bea", student_number: "S-2"}))

    subject =
      Repo.insert!(Subject.changeset(%Subject{}, %{name: "Math", code: "M2", credit_hours: 2}))

    assert %{"data" => [_]} =
             put(conn, @base <> "/students/#{student.id}/grades", %{
               grades: [%{subject_id: subject.id, mark: 95}]
             })
             |> json_response(201)

    assert %{"data" => %{"average" => 95.0, "rank" => 1}} =
             get(conn, @base <> "/students/#{student.id}/report") |> json_response(200)

    assert %{"data" => scale} = get(conn, @base <> "/grading-scale") |> json_response(200)

    assert %{"data" => _} =
             put(conn, @base <> "/grading-scale", %{scale: scale}) |> json_response(200)

    assert %{"error" => %{"code" => "validation_failed"}} =
             put(conn, @base <> "/grading-scale", %{scale: [%{min: 0, letter: ""}]})
             |> json_response(422)

    assert %{"data" => _} = get(conn, @base <> "/stats") |> json_response(200)
    csv = get(conn, @base <> "/export/students.csv")
    assert response(csv, 200) =~ "M2"

    assert "" =
             delete(conn, @base <> "/students/#{student.id}/grades/#{subject.id}")
             |> response(204)

    assert "" = delete(conn, @base <> "/subjects/#{subject.id}") |> response(204)
    assert "" = delete(conn, @base <> "/students/#{student.id}") |> response(204)
  end
end
