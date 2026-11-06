defmodule GradeApiWeb.ErrorJSONTest do
  use GradeApiWeb.ConnCase, async: true

  test "renders 404" do
    assert GradeApiWeb.ErrorJSON.render("404.json", %{}) == %{
             error: %{code: "not_found", message: "Not found"}
           }
  end

  test "renders 500" do
    assert GradeApiWeb.ErrorJSON.render("500.json", %{}) ==
             %{errors: %{detail: "Internal Server Error"}}
  end
end
