defmodule GradeApiWeb.ErrorJSON do
  @moduledoc """
  This module is invoked by your endpoint in case of errors on JSON requests.

  See config/config.exs.
  """

  # If you want to customize a particular status code,
  # you may add your own clauses, such as:
  #
  # def render("500.json", _assigns) do
  #   %{errors: %{detail: "Internal Server Error"}}
  # end

  # By default, Phoenix returns the status message from
  # the template name. For example, "404.json" becomes
  # "Not Found".
  def render("404.json", _assigns) do
    %{error: %{code: "not_found", message: "Not found"}}
  end

  def render("422.json", _assigns) do
    %{
      error: %{
        code: "validation_failed",
        message: "Validation failed",
        fields: %{base: ["is invalid"]}
      }
    }
  end

  def render(template, _assigns) do
    %{errors: %{detail: Phoenix.Controller.status_message_from_template(template)}}
  end
end
