variable "name" { type = string }
variable "project_id" { type = string }
variable "entry_point" { type = string }
variable "source_dir" { type = string }
variable "invokers" { type = list(string) }

variable "region" {
  default = "europe-west1"
}
variable "description" {
  default = "Serverless function"
}
variable "runtime" {
  default = "nodejs20"
}
variable "memory" {
  default = "256M"
}
variable "timeout" {
  default = 60
}
variable "max_instances" {
  default = 1
}
variable "env" {
  type    = map(string)
  default = {}
}
