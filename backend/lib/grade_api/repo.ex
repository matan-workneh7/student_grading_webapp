defmodule GradeApi.Repo do
  use Ecto.Repo,
    otp_app: :grade_api,
    adapter: Ecto.Adapters.SQLite3
end
