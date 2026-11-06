defmodule GradeApiWeb.Cors do
  import Plug.Conn
  @origin "http://localhost:3000"
  def init(opts), do: opts

  def call(conn, _opts) do
    conn =
      put_resp_header(conn, "access-control-allow-origin", @origin)
      |> put_resp_header("access-control-allow-methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
      |> put_resp_header("access-control-allow-headers", "content-type")

    if conn.method == "OPTIONS", do: conn |> send_resp(204, "") |> halt(), else: conn
  end
end
