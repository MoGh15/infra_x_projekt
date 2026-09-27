#!/usr/bin/env bash
set -Eeuo pipefail

# Aktuell stabile Version laut offizieller cert-manager-Dokumentation (Stand: 2026-09-27).
# Bei Bedarf ueberschreiben, z. B.: CERT_MANAGER_VERSION=v1.21.2 ./install-cert-manager.sh
CERT_MANAGER_VERSION="${CERT_MANAGER_VERSION:-v1.21.2}"
NAMESPACE="${CERT_MANAGER_NAMESPACE:-cert-manager}"
RELEASE_NAME="${CERT_MANAGER_RELEASE_NAME:-cert-manager}"
CHART="oci://quay.io/jetstack/charts/cert-manager"
TIMEOUT="${CERT_MANAGER_TIMEOUT:-10m}"

require_command() {
	if ! command -v "$1" >/dev/null 2>&1; then
		echo "Fehler: '$1' wurde nicht gefunden." >&2
		exit 1
	fi
}

require_command kubectl
require_command helm

if ! kubectl cluster-info >/dev/null 2>&1; then
	echo "Fehler: Der konfigurierte Kubernetes-Cluster ist nicht erreichbar." >&2
	exit 1
fi

CURRENT_CONTEXT="$(kubectl config current-context)"

echo "=== cert-manager ${CERT_MANAGER_VERSION} installieren ==="
echo "Kubernetes-Kontext: ${CURRENT_CONTEXT}"
echo "Namespace:          ${NAMESPACE}"

helm upgrade --install "${RELEASE_NAME}" "${CHART}" \
	--version "${CERT_MANAGER_VERSION}" \
	--namespace "${NAMESPACE}" \
	--create-namespace \
	--set crds.enabled=true \
	--wait \
	--wait-for-jobs \
	--timeout "${TIMEOUT}" \
	--atomic

kubectl wait \
	--namespace "${NAMESPACE}" \
	--for=condition=Available \
	deployment \
	--selector="app.kubernetes.io/instance=${RELEASE_NAME}" \
	--timeout="${TIMEOUT}"

echo ""
echo "=== cert-manager wurde erfolgreich installiert ==="
helm status "${RELEASE_NAME}" --namespace "${NAMESPACE}"
