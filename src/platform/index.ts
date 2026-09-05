export { TENSORNOTE_VERSION } from '../version'

export { CURRENT_WORKSPACE_SCHEMA_VERSION, parseWorkspaceManifest, parseWorkspaceManifestWithCompatibility } from '../workspace/schema'
export { WORKSPACE_PROVIDER_API_VERSION, WorkspaceConflictError } from '../workspace/types'
export type { WorkspaceCapabilities, WorkspaceDescriptor, WorkspaceEntry, WorkspaceFileStat, WorkspaceManifest, WorkspaceProvider, WorkspaceSession, WorkspaceWriteOptions } from '../workspace/types'

export { COMPUTE_CONNECTOR_API_VERSION, COMPUTE_PROVIDER_API_VERSION } from '../compute/types'
export type { CellOutput, ComputeConnectionConfig, ComputeConnectionEvent, ComputeConnectionLease, ComputeConnectionPhase, ComputeConnectionRequest, ComputeConnector, ComputeConnectorConfig, ComputeConnectorDiagnosticResult, ComputeConnectorKind, ComputeContext, ComputeKernelSpec, ComputeProfile, ComputeProvider, ComputeSession, ComputeSessionScope, ComputeWorkspaceSource, DiagnosticCheck, ExecutionHandlers } from '../compute/types'
export { computeConnectorCompatibilityMatrix, connectorCompatibility, formatComputeDiagnosticReport } from '../compute/compatibility'
export type { ComputeConnectorCompatibility } from '../compute/compatibility'

export { EXTENSION_API_VERSION } from '../extensions/constants'
export type { ExtensionAPI, ExtensionManifest, ExtensionModule, ExtensionPermission, ExtensionSetting } from '../extensions/types'

export { EXECUTABLE_MARKDOWN_SYNTAX_VERSION, createExecutableLabMarkdown, extractLabs, updateLabCells } from '../content/labParser'
export type { ExecutableLabDraft } from '../content/labParser'

export { SECRET_MODEL_VERSION, SETTINGS_MODEL_VERSION } from './contracts'

export type { HostAdapter, HostCapabilities, HostPlatformInfo, HostUpdateInfo, HostUpdateProgress } from '../host/types'
