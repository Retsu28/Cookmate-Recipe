# CookMate — Kubernetes Deployment

## Prerequisites

- Kubernetes cluster (GKE, EKS, AKS, or local minikube/kind)
- `kubectl` configured
- Container images pushed to `ghcr.io` (via CI/CD pipeline)
- Nginx Ingress Controller installed
- cert-manager installed (for TLS)

## Deploy

```bash
# 1. Create namespace
kubectl apply -f k8s/namespace.yml

# 2. Apply secrets (edit with real base64 values first!)
kubectl apply -f k8s/secrets.yml

# 3. Apply config
kubectl apply -f k8s/configmap.yml

# 4. Deploy infrastructure
kubectl apply -f k8s/postgres-deployment.yml
kubectl apply -f k8s/redis-deployment.yml

# 5. Wait for infrastructure to be ready
kubectl -n cookmate wait --for=condition=ready pod -l app=postgres --timeout=60s
kubectl -n cookmate wait --for=condition=ready pod -l app=redis --timeout=60s

# 6. Deploy application services
kubectl apply -f k8s/api-deployment.yml
kubectl apply -f k8s/ml-deployment.yml
kubectl apply -f k8s/web-deployment.yml

# 7. Apply HPA (auto-scaling)
kubectl apply -f k8s/api-hpa.yml

# 8. Apply ingress (external access)
kubectl apply -f k8s/ingress.yml
```

## Verify

```bash
# Check all pods
kubectl -n cookmate get pods

# Check services
kubectl -n cookmate get svc

# Check HPA status
kubectl -n cookmate get hpa

# API health check
kubectl -n cookmate port-forward svc/api-service 5000:5000
curl http://localhost:5000/api/health
```

## Scale Manually

```bash
# Scale API to 5 replicas
kubectl -n cookmate scale deployment cookmate-api --replicas=5

# Scale web to 3 replicas
kubectl -n cookmate scale deployment cookmate-web --replicas=3
```

## Architecture

```text
Internet → Ingress (TLS) → Nginx Ingress Controller
                              ├── cookmate.app     → web-service (2 pods)
                              └── api.cookmate.app → api-service (2-10 pods, HPA)
                                                        ├── postgres-service (1 pod, PVC)
                                                        ├── redis-service (1 pod, PVC)
                                                        └── ml-service (1 pod)
```

## Auto-Scaling Policy

| Metric | Target | Min Pods | Max Pods |
|---|---|---|---|
| CPU utilization | 70% | 2 | 10 |
| Memory utilization | 80% | 2 | 10 |

- Scale up: +2 pods per 60s (stabilization: 60s)
- Scale down: -1 pod per 120s (stabilization: 300s)
