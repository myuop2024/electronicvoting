# Anomaly Investigation Playbook

## Trigger
- Unexpected spike in offline vote submissions
- Fabric `VoteCast` events missing for more than two minutes
- Observer alerts for turnout anomalies

## Steps
1. **Triage**
   - Check Grafana dashboards for API latency and queue depth.
   - Review audit log hash chain for recent admin actions.
2. **Containment**
   - Enable recount mode via Super Admin panel to pause new vote casting.
   - Notify Org Admins and Observers using broadcast templates.
3. **Investigation**
   - Query PostgreSQL for affected elections and correlate with Fabric transaction IDs.
   - Inspect worker logs for OCR pipeline delays or AI flagging.
   - Validate Didit webhook delivery by checking signature verification logs.
4. **Recovery**
   - Reconcile missing votes by replaying Fabric events from the last confirmed block.
   - Resume voting by disabling recount mode.
5. **Postmortem**
   - Document root cause, mitigation, and backlog actions in the runbook repository.
   - Update k6 scenarios if load patterns contributed to anomaly.
