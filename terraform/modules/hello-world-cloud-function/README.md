# Hello World Cloud Function Module

Simple google function with a single HTTP endpoint that responds with "Hello World!".

## Test if it works

```bash
curl -H "Authorization: Bearer $(gcloud auth print-identity-token)" https://<function-url>/hello-world
```
