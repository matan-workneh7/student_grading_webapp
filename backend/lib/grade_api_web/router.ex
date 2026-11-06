defmodule GradeApiWeb.Router do
  use GradeApiWeb, :router

  pipeline :api do
    plug :accepts, ["json"]
  end

  scope "/api/v1", GradeApiWeb do
    pipe_through :api
    get "/health", ApiController, :health
    get "/students", ApiController, :students
    post "/students", ApiController, :create_student
    get "/students/:id", ApiController, :student
    patch "/students/:id", ApiController, :update_student
    delete "/students/:id", ApiController, :delete_student
    put "/students/:id/grades", ApiController, :put_grades
    delete "/students/:id/grades/:subject_id", ApiController, :delete_grade
    get "/students/:id/report", ApiController, :report
    get "/subjects", ApiController, :subjects
    post "/subjects", ApiController, :create_subject
    patch "/subjects/:id", ApiController, :update_subject
    delete "/subjects/:id", ApiController, :delete_subject
    post "/calculate", ApiController, :calculate
    get "/grading-scale", ApiController, :scale
    put "/grading-scale", ApiController, :update_scale
    get "/stats", ApiController, :stats
    get "/export/students.csv", ApiController, :export
  end
end
