#!/usr/bin/env bash


NAMESPACE="praxis"
helm dependency update
helm upgrade --install praxis-form . --create-namespace -n "${NAMESPACE}"
