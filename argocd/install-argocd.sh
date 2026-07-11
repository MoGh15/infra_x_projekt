#!/usr/bin/env bash
set -euo pipefail

NAMESPACE="argocd"
RELEASE_NAME="argocd"
DOMAIN="argocd.praxis-form.de"
CLUSTER_ISSUER="praxis-form-letsencrypt-prod"

echo "=== ArgoCD Installation via Helm ==="

# Namespace erstellen
kubectl create namespace "${NAMESPACE}" --dry-run=client -o yaml | kubectl apply -f -

# Helm Repo hinzufügen
helm repo add argo https://argoproj.github.io/argo-helm
helm repo update

# ArgoCD installieren mit Ingress + TLS via bestehendem ClusterIssuer
helm upgrade --install "${RELEASE_NAME}" argo/argo-cd \
  --namespace "${NAMESPACE}" \
  --set 'server.ingress.enabled=true' \
  --set "server.ingress.hostname=${DOMAIN}" \
  --set 'server.ingress.ingressClassName=nginx' \
  --set "server.ingress.annotations.cert-manager\.io/cluster-issuer=${CLUSTER_ISSUER}" \
  --set 'server.ingress.annotations.nginx\.ingress\.kubernetes\.io/ssl-redirect=false' \
  --set 'server.ingress.annotations.nginx\.ingress\.kubernetes\.io/force-ssl-redirect=false' \
  --set 'server.ingress.annotations.nginx\.ingress\.kubernetes\.io/backend-protocol=HTTP' \
  --set 'server.ingress.tls=true' \
  --set "server.ingress.extraTls[0].hosts[0]=${DOMAIN}" \
  --set "server.ingress.extraTls[0].secretName=argocd-tls" \
  --set 'configs.params."server\.insecure"=true' \
  --wait

echo ""
echo "=== ArgoCD erfolgreich installiert ==="
echo "URL: https://${DOMAIN}"
echo ""
echo "Admin-Passwort abrufen:"
echo "  kubectl -n ${NAMESPACE} get secret argocd-initial-admin-secret -o jsonpath='{.data.password}' | base64 -d; echo"
