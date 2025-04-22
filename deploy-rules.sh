#!/bin/bash

# Deploy Firestore security rules
firebase deploy --only firestore:rules

echo "Firestore security rules deployed successfully!" 