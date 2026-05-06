/**
 * KeyRotationDashboard.jsx
 * FASE 7: Key rotation management interface
 * Manage encryption key rotation policies, schedules, and history
 */

import React, { useState, useEffect, useCallback } from "react";
import { useApiSecrets } from "../../hooks/useApiSecrets";
import logger from "../../utils/logger";
import "./KeyRotationDashboard.css";

/**
 * Rotation Policy Configuration Modal
 */
function RotationPolicyModal({ isOpen, isEdit, policy, onClose, onSave, loading }) {
  const [formData, setFormData] = useState({
    secretId: "",
    rotationInterval: 90, // days
    rotationSchedule: "0 2 * * 0", // weekly Sunday 2 AM
    autoRotateEnabled: true,
    notifyBefore: 7, // days before rotation
    maxRotationsKept: 5,
    ...policy,
  });

  useEffect(() => {
    if (policy && isEdit) {
      setFormData(policy);
    }
  }, [policy, isEdit, isOpen]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.secretId || !formData.rotationSchedule) {
      logger.warn("Policy form incomplete");
      return;
    }
    onSave(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content policy-modal">
        <div className="modal-header">
          <h2>{isEdit ? "Edit Rotation Policy" : "Create Rotation Policy"}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="policy-form">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="secret-select">Select Secret</label>
              <select
                id="secret-select"
                name="secretId"
                value={formData.secretId}
                onChange={handleChange}
                disabled={loading || isEdit}
              >
                <option value="">Choose a secret...</option>
                <option value="db_password">Database Password</option>
                <option value="api_key">API Key</option>
                <option value="jwt_secret">JWT Secret</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="rotation-interval">Rotation Interval (days)</label>
              <input
                id="rotation-interval"
                type="number"
                name="rotationInterval"
                min="1"
                max="365"
                value={formData.rotationInterval}
                onChange={handleChange}
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="cron-schedule">Cron Schedule</label>
            <input
              id="cron-schedule"
              type="text"
              name="rotationSchedule"
              value={formData.rotationSchedule}
              onChange={handleChange}
              placeholder="0 2 * * 0 (every Sunday at 2 AM)"
              disabled={loading}
            />
            <small>Format: minute hour day month weekday (UTC)</small>
          </div>

          <div className="form-row">
            <div className="form-group checkbox">
              <input
                id="auto-rotate"
                type="checkbox"
                name="autoRotateEnabled"
                checked={formData.autoRotateEnabled}
                onChange={handleChange}
                disabled={loading}
              />
              <label htmlFor="auto-rotate">Enable Automatic Rotation</label>
            </div>

            <div className="form-group">
              <label htmlFor="notify-before">Notify Before (days)</label>
              <input
                id="notify-before"
                type="number"
                name="notifyBefore"
                min="1"
                max="30"
                value={formData.notifyBefore}
                onChange={handleChange}
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="max-rotations">Maximum Rotations to Keep</label>
            <input
              id="max-rotations"
              type="number"
              name="maxRotationsKept"
              min="1"
              max="20"
              value={formData.maxRotationsKept}
              onChange={handleChange}
              disabled={loading}
            />
          </div>

          <div className="cron-preview">
            <strong>📅 Preview:</strong>
            <span>Every {formData.rotationInterval} days on {formData.rotationSchedule}</span>
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? "Saving..." : "Save Policy"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/**
 * Rotation History Viewer
 */
function RotationHistoryModal({ isOpen, secretId, onClose }) {
  const [history, setHistory] = useState([
    {
      id: 1,
      secretId: secretId,
      rotatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      rotatedBy: "system",
      status: "completed",
      oldKeyId: "key_v1_abc123",
      newKeyId: "key_v2_def456",
      duration: 245,
    },
    {
      id: 2,
      secretId: secretId,
      rotatedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      rotatedBy: "admin@example.com",
      status: "completed",
      oldKeyId: "key_v0_xyz789",
      newKeyId: "key_v1_abc123",
      duration: 312,
    },
    {
      id: 3,
      secretId: secretId,
      rotatedAt: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000),
      rotatedBy: "system",
      status: "completed",
      oldKeyId: "key_initial",
      newKeyId: "key_v0_xyz789",
      duration: 198,
    },
  ]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content history-modal">
        <div className="modal-header">
          <h2>Rotation History</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="history-timeline">
          {history.map((entry, idx) => (
            <div key={entry.id} className="history-entry">
              <div className="timeline-marker">
                <div className="marker-circle"></div>
                {idx < history.length - 1 && <div className="timeline-line"></div>}
              </div>
              <div className="history-content">
                <div className="history-header">
                  <span className="status-badge completed">✓ {entry.status}</span>
                  <span className="history-date">{entry.rotatedAt.toLocaleString()}</span>
                </div>
                <div className="history-details">
                  <div className="detail-row">
                    <strong>Rotated by:</strong>
                    <span>{entry.rotatedBy}</span>
                  </div>
                  <div className="detail-row">
                    <strong>Duration:</strong>
                    <span>{entry.duration}ms</span>
                  </div>
                  <div className="key-transition">
                    <code>{entry.oldKeyId}</code>
                    <span className="arrow">→</span>
                    <code>{entry.newKeyId}</code>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Scheduled Rotations Preview
 */
function ScheduledRotationsModal({ isOpen, onClose }) {
  const [upcomingRotations] = useState([
    {
      id: 1,
      secretName: "database_password",
      scheduledFor: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      status: "scheduled",
      daysUntil: 3,
    },
    {
      id: 2,
      secretName: "api_key",
      scheduledFor: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      status: "scheduled",
      daysUntil: 7,
    },
    {
      id: 3,
      secretName: "jwt_secret",
      scheduledFor: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      status: "scheduled",
      daysUntil: 14,
    },
  ]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content scheduled-modal">
        <div className="modal-header">
          <h2>Upcoming Scheduled Rotations</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="scheduled-list">
          {upcomingRotations.map((rotation) => (
            <div key={rotation.id} className={`rotation-card days-${rotation.daysUntil}`}>
              <div className="rotation-header">
                <span className="secret-name">{rotation.secretName}</span>
                <span className={`days-badge days-${rotation.daysUntil > 7 ? 'many' : 'few'}`}>
                  {rotation.daysUntil} days
                </span>
              </div>
              <div className="rotation-date">
                📅 {rotation.scheduledFor.toLocaleDateString()} at{" "}
                {rotation.scheduledFor.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
              <div className="rotation-actions">
                <button className="btn btn-small btn-primary">
                  Rotate Now
                </button>
                <button className="btn btn-small btn-secondary">
                  Reschedule
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Main Key Rotation Dashboard
 */
export function KeyRotationDashboard() {
  const [policies, setPolicies] = useState([
    {
      id: 1,
      secretId: "db_password",
      secretName: "Database Password",
      rotationInterval: 90,
      rotationSchedule: "0 2 * * 0",
      autoRotateEnabled: true,
      lastRotation: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      nextRotation: new Date(Date.now() + 83 * 24 * 60 * 60 * 1000),
      notifyBefore: 7,
      maxRotationsKept: 5,
      status: "active",
    },
    {
      id: 2,
      secretId: "api_key",
      secretName: "API Key",
      rotationInterval: 180,
      rotationSchedule: "0 3 1 * *",
      autoRotateEnabled: true,
      lastRotation: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      nextRotation: new Date(Date.now() + 150 * 24 * 60 * 60 * 1000),
      notifyBefore: 14,
      maxRotationsKept: 3,
      status: "active",
    },
  ]);

  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showScheduledModal, setShowScheduledModal] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState(null);
  const [selectedSecretId, setSelectedSecretId] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleCreatePolicy = (formData) => {
    setLoading(true);
    setTimeout(() => {
      const newPolicy = {
        id: policies.length + 1,
        ...formData,
        lastRotation: new Date(),
        nextRotation: new Date(Date.now() + formData.rotationInterval * 24 * 60 * 60 * 1000),
        status: "active",
      };
      setPolicies([...policies, newPolicy]);
      setShowPolicyModal(false);
      logger.log("Policy created", { id: newPolicy.id });
      setLoading(false);
    }, 1000);
  };

  const handleRotateNow = (policyId) => {
    if (!confirm("Rotate this key now?")) return;
    setLoading(true);
    setTimeout(() => {
      setPolicies((prev) =>
        prev.map((p) =>
          p.id === policyId
            ? {
                ...p,
                lastRotation: new Date(),
                nextRotation: new Date(Date.now() + p.rotationInterval * 24 * 60 * 60 * 1000),
              }
            : p
        )
      );
      logger.log("Key rotated", { policyId });
      setLoading(false);
    }, 1500);
  };

  const handleDeletePolicy = (policyId) => {
    if (!confirm("Delete this rotation policy?")) return;
    setPolicies((prev) => prev.filter((p) => p.id !== policyId));
    logger.log("Policy deleted", { policyId });
  };

  return (
    <div className="key-rotation-dashboard">
      <div className="dashboard-header">
        <div className="header-content">
          <h1>🔄 Key Rotation Management</h1>
          <p>Manage encryption key rotation policies and schedules</p>
        </div>
        <div className="header-actions">
          <button
            className="btn btn-secondary"
            onClick={() => setShowScheduledModal(true)}
          >
            📅 View Schedule
          </button>
          <button
            className="btn btn-primary btn-lg"
            onClick={() => {
              setEditingPolicy(null);
              setShowPolicyModal(true);
            }}
          >
            + Create Policy
          </button>
        </div>
      </div>

      <div className="rotation-cards">
        {policies.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🔄</div>
            <h3>No rotation policies</h3>
            <p>Create your first rotation policy to get started</p>
          </div>
        ) : (
          policies.map((policy) => {
            const daysUntilRotation = Math.ceil(
              (policy.nextRotation - new Date()) / (1000 * 60 * 60 * 24)
            );
            const isUrgent = daysUntilRotation <= policy.notifyBefore;

            return (
              <div
                key={policy.id}
                className={`rotation-card ${isUrgent ? "urgent" : ""}`}
              >
                <div className="card-header">
                  <div className="secret-info">
                    <h3>{policy.secretName}</h3>
                    <code>{policy.secretId}</code>
                  </div>
                  <span className={`status-badge ${policy.status}`}>
                    {policy.status}
                  </span>
                </div>

                <div className="card-content">
                  <div className="policy-row">
                    <strong>Interval:</strong>
                    <span>{policy.rotationInterval} days</span>
                  </div>
                  <div className="policy-row">
                    <strong>Last Rotation:</strong>
                    <span>{policy.lastRotation.toLocaleDateString()}</span>
                  </div>
                  <div className="policy-row">
                    <strong>Next Rotation:</strong>
                    <span className={isUrgent ? "urgent-text" : ""}>
                      {policy.nextRotation.toLocaleDateString()}
                      <span className="days-badge">{daysUntilRotation}d</span>
                    </span>
                  </div>
                  <div className="policy-row">
                    <strong>Schedule:</strong>
                    <code>{policy.rotationSchedule}</code>
                  </div>
                  <div className="policy-row">
                    <strong>Auto Rotate:</strong>
                    <span>{policy.autoRotateEnabled ? "✓ Enabled" : "✕ Disabled"}</span>
                  </div>
                </div>

                <div className="card-progress">
                  <div className="progress-label">
                    Days until rotation: {daysUntilRotation}/{policy.rotationInterval}
                  </div>
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${Math.min(
                          100,
                          ((policy.rotationInterval - daysUntilRotation) /
                            policy.rotationInterval) *
                            100
                        )}%`,
                      }}
                    ></div>
                  </div>
                </div>

                <div className="card-actions">
                  <button
                    className="action-btn rotate"
                    onClick={() => handleRotateNow(policy.id)}
                    disabled={loading}
                    title="Rotate key now"
                  >
                    ⚡ Rotate Now
                  </button>
                  <button
                    className="action-btn history"
                    onClick={() => {
                      setSelectedSecretId(policy.secretId);
                      setShowHistoryModal(true);
                    }}
                    title="View history"
                  >
                    📜 History
                  </button>
                  <button
                    className="action-btn edit"
                    onClick={() => {
                      setEditingPolicy(policy);
                      setShowPolicyModal(true);
                    }}
                    title="Edit policy"
                  >
                    ✏️ Edit
                  </button>
                  <button
                    className="action-btn delete"
                    onClick={() => handleDeletePolicy(policy.id)}
                    title="Delete policy"
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="rotation-stats">
        <div className="stat-card">
          <div className="stat-label">Active Policies</div>
          <div className="stat-value">{policies.filter((p) => p.status === "active").length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Urgent (≤7 days)</div>
          <div className="stat-value">
            {policies.filter(
              (p) =>
                Math.ceil((p.nextRotation - new Date()) / (1000 * 60 * 60 * 24)) <=
                p.notifyBefore
            ).length}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Last Week Rotations</div>
          <div className="stat-value">
            {policies.filter(
              (p) => new Date() - p.lastRotation < 7 * 24 * 60 * 60 * 1000
            ).length}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Keys Managed</div>
          <div className="stat-value">{policies.length}</div>
        </div>
      </div>

      {/* Modals */}
      <RotationPolicyModal
        isOpen={showPolicyModal}
        isEdit={!!editingPolicy}
        policy={editingPolicy}
        onClose={() => {
          setShowPolicyModal(false);
          setEditingPolicy(null);
        }}
        onSave={editingPolicy ? () => {} : handleCreatePolicy}
        loading={loading}
      />

      <RotationHistoryModal
        isOpen={showHistoryModal}
        secretId={selectedSecretId}
        onClose={() => setShowHistoryModal(false)}
      />

      <ScheduledRotationsModal
        isOpen={showScheduledModal}
        onClose={() => setShowScheduledModal(false)}
      />
    </div>
  );
}

export default KeyRotationDashboard;
