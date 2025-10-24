output "hello_world_function_url" {
  description = "Public URL of the deployed Hello World Cloud Function"
  value       = module.hello_world.function_url
}
