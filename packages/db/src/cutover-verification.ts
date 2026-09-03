export type DatabaseIdentity = {
  databaseName: string
  databaseOid: string
  systemIdentifier: string
}

export type MigrationLedgerRow = { checksum: string | null; hash: string }

export type SequenceState = {
  isCalled: boolean
  lastValue: string
  ownerColumn: string | null
  ownerTable: string | null
  sequenceName: string
}

export function areDatabaseTargetsDistinct(
  sourceUrl: string,
  destinationUrl: string,
  sourceIdentity: DatabaseIdentity,
  destinationIdentity: DatabaseIdentity,
) {
  return (
    sourceUrl !== destinationUrl &&
    (sourceIdentity.systemIdentifier !== destinationIdentity.systemIdentifier ||
      sourceIdentity.databaseOid !== destinationIdentity.databaseOid)
  )
}

export function compareMigrationLedgers(source: MigrationLedgerRow[], destination: MigrationLedgerRow[]) {
  const sourceByTag = new Map(source.map((migration) => [migration.hash, migration.checksum]))
  const destinationByTag = new Map(destination.map((migration) => [migration.hash, migration.checksum]))

  return {
    missingInDestination: source.filter((migration) => !destinationByTag.has(migration.hash)).map(({ hash }) => hash),
    missingInSource: destination.filter((migration) => !sourceByTag.has(migration.hash)).map(({ hash }) => hash),
    checksumMismatches: source
      .filter(
        (migration) =>
          destinationByTag.has(migration.hash) && destinationByTag.get(migration.hash) !== migration.checksum,
      )
      .map(({ hash }) => hash),
  }
}

export function compareSequenceStates(source: SequenceState[], destination: SequenceState[]) {
  const sourceByName = new Map(source.map((sequence) => [sequence.sequenceName, sequence]))
  const destinationByName = new Map(destination.map((sequence) => [sequence.sequenceName, sequence]))

  return {
    missingInDestination: source.filter((sequence) => !destinationByName.has(sequence.sequenceName)),
    missingInSource: destination.filter((sequence) => !sourceByName.has(sequence.sequenceName)),
    mismatches: source.filter((sequence) => {
      const other = destinationByName.get(sequence.sequenceName)

      return (
        other !== undefined &&
        (sequence.ownerTable !== other.ownerTable ||
          sequence.ownerColumn !== other.ownerColumn ||
          sequence.lastValue !== other.lastValue ||
          sequence.isCalled !== other.isCalled)
      )
    }),
  }
}

export function compareTableSets(source: string[], destination: string[], destinationAllowlist: ReadonlySet<string>) {
  const sourceSet = new Set(source)
  const destinationSet = new Set(destination)
  const extraInDestination = destination.filter((table) => !sourceSet.has(table))

  return {
    missingInDestination: source.filter((table) => !destinationSet.has(table)),
    unexpectedInDestination: extraInDestination.filter((table) => !destinationAllowlist.has(table)),
    allowlistedInDestination: extraInDestination.filter((table) => destinationAllowlist.has(table)),
  }
}

export function isExactProductionReadiness(
  statusCode: number,
  payload: { checks?: Record<string, { status?: string }>; status?: string } | null,
) {
  return (
    statusCode === 200 &&
    payload?.status === 'ready' &&
    payload.checks?.['database']?.status === 'ok' &&
    payload.checks?.['redis']?.status === 'ok'
  )
}
