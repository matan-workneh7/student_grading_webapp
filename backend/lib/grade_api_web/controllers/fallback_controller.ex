defmodule GradeApiWeb.FallbackController do
  use GradeApiWeb, :controller

  def call(conn, {:error, :not_found}),
    do: conn |> put_status(404) |> json(%{error: %{code: "not_found", message: "Not found"}})

  def call(conn, {:error, fields}),
    do:
      conn
      |> put_status(422)
      |> json(%{
        error: %{code: "validation_failed", message: "Validation failed", fields: fields}
      })
end
