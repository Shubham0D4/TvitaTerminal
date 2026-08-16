export function serializeDecimal(val: any): number {
  if (val === null || val === undefined) return 0
  return Number(val)
}

export function serializeDate(val: any): string | null {
  if (!val) return null
  if (val instanceof Date) return val.toISOString()
  return String(val)
}

export function clientToDTO(client: any) {
  if (!client) return null
  return {
    id: client.id,
    clientType: client.clientType,
    legalName: client.legalName,
    displayName: client.displayName,
    country: client.country,
    stateProvince: client.stateProvince,
    city: client.city,
    timezone: client.timezone,
    industry: client.industry,
    website: client.website,
    contactPerson: client.contactPerson,
    designation: client.designation,
    email: client.email,
    phone: client.phone,
    whatsapp: client.whatsapp,
    preferredComm: client.preferredComm,
    address: client.address,
    registeredAddress: client.registeredAddress,
    billingCity: client.billingCity,
    billingState: client.billingState,
    billingCountry: client.billingCountry,
    postalCode: client.postalCode,
    entityType: client.entityType,
    registrationNo: client.registrationNo,
    countryOfRegistration: client.countryOfRegistration,
    taxId: client.taxId,
    pan: client.pan,
    gstin: client.gstin,
    vatNumber: client.vatNumber,
    authorizedRep: client.authorizedRep,
    billingName: client.billingName,
    billingEmail: client.billingEmail,
    currency: client.currency,
    taxApplicable: client.taxApplicable,
    taxRate: serializeDecimal(client.taxRate),
    poRequired: client.poRequired,
    poNumber: client.poNumber,
    paymentTerms: client.paymentTerms,
    paymentMethod: client.paymentMethod,
    paymentReference: client.paymentReference,
    paymentProvider: client.paymentProvider,
    paymentInstructions: client.paymentInstructions,
    txnFeeResponsibility: client.txnFeeResponsibility,
    clientSource: client.clientSource,
    clientPriority: client.clientPriority,
    accountManagerId: client.accountManagerId,
    internalTags: client.internalTags || [],
    riskLevel: client.riskLevel,
    name: client.name,
    status: client.status,
    onboardingStatus: client.onboardingStatus,
    verificationStatus: client.verificationStatus,
    profileId: client.profileId,
    createdById: client.createdById,
    updatedById: client.updatedById,
    createdAt: serializeDate(client.createdAt),
    updatedAt: serializeDate(client.updatedAt),
    // Relations if pre-loaded
    projects: client.projects ? client.projects.map(projectToDTO) : undefined,
    subscriptions: client.subscriptions ? client.subscriptions.map(subscriptionToDTO) : undefined,
    subTeams: client.subTeams ? client.subTeams : undefined,
  }
}

export function invoiceToDTO(invoice: any) {
  if (!invoice) return null
  return {
    id: invoice.id,
    invoiceNo: invoice.invoiceNo,
    clientId: invoice.clientId,
    projectId: invoice.projectId,
    amount: serializeDecimal(invoice.amount),
    subtotal: serializeDecimal(invoice.subtotal),
    taxAmount: serializeDecimal(invoice.taxAmount),
    taxRate: serializeDecimal(invoice.taxRate),
    currency: invoice.currency,
    status: invoice.status,
    issuedDate: serializeDate(invoice.issuedDate),
    dueDate: serializeDate(invoice.dueDate),
    paidDate: serializeDate(invoice.paidDate),
    notes: invoice.notes,
    lineItems: invoice.lineItems,
    pdfUrl: invoice.pdfUrl,
    createdById: invoice.createdById,
    createdAt: serializeDate(invoice.createdAt),
    updatedAt: serializeDate(invoice.updatedAt),
    // Relations if pre-loaded
    client: invoice.client ? clientToDTO(invoice.client) : undefined,
    project: invoice.project ? projectToDTO(invoice.project) : undefined,
  }
}

export function subscriptionToDTO(sub: any) {
  if (!sub) return null
  return {
    id: sub.id,
    clientId: sub.clientId,
    planId: sub.planId,
    status: sub.status,
    startDate: serializeDate(sub.startDate),
    endDate: serializeDate(sub.endDate),
    renewalDate: serializeDate(sub.renewalDate),
    notes: sub.notes,
    stripeSubId: sub.stripeSubId,
    createdById: sub.createdById,
    createdAt: serializeDate(sub.createdAt),
    updatedAt: serializeDate(sub.updatedAt),
    // Relations
    plan: sub.plan ? planToDTO(sub.plan) : undefined,
    client: sub.client ? clientToDTO(sub.client) : undefined,
  }
}

export function planToDTO(plan: any) {
  if (!plan) return null
  return {
    id: plan.id,
    name: plan.name,
    description: plan.description,
    price: serializeDecimal(plan.price),
    currency: plan.currency,
    billingCycle: plan.billingCycle,
    isActive: plan.isActive,
    isPrivate: plan.isPrivate,
    clientId: plan.clientId,
    stripeProductId: plan.stripeProductId,
    stripePriceId: plan.stripePriceId,
    createdAt: serializeDate(plan.createdAt),
    updatedAt: serializeDate(plan.updatedAt),
    features: plan.features || [],
  }
}

export function projectToDTO(project: any) {
  if (!project) return null
  return {
    id: project.id,
    clientId: project.clientId,
    name: project.name,
    description: project.description,
    status: project.status,
    progress: project.progress,
    startDate: serializeDate(project.startDate),
    endDate: serializeDate(project.endDate),
    leadId: project.leadId,
    createdById: project.createdById,
    banner: project.banner,
    createdAt: serializeDate(project.createdAt),
    updatedAt: serializeDate(project.updatedAt),
    // Relations
    client: project.client ? clientToDTO(project.client) : undefined,
    lead: project.lead ? profileToDTO(project.lead) : undefined,
    members: project.members ? project.members.map((m: any) => ({
      id: m.id,
      role: m.role,
      profile: profileToDTO(m.profile),
    })) : undefined,
  }
}

export function taskToDTO(task: any) {
  if (!task) return null
  return {
    id: task.id,
    projectId: task.projectId,
    milestoneId: task.milestoneId,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    assigneeId: task.assigneeId,
    developerId: task.developerId,
    testerId: task.testerId,
    dueDate: serializeDate(task.dueDate),
    clientVisible: task.clientVisible,
    createdById: task.createdById,
    createdAt: serializeDate(task.createdAt),
    updatedAt: serializeDate(task.updatedAt),
    // Relations
    assignee: task.assignee ? profileToDTO(task.assignee) : undefined,
    developer: task.developer ? profileToDTO(task.developer) : undefined,
    tester: task.tester ? profileToDTO(task.tester) : undefined,
    project: task.project ? projectToDTO(task.project) : undefined,
    milestone: task.milestone ? {
      id: task.milestone.id,
      name: task.milestone.name,
      status: task.milestone.status,
    } : undefined,
  }
}

export function profileToDTO(profile: any) {
  if (!profile) return null
  return {
    id: profile.id,
    role: profile.role,
    teamRole: profile.teamRole,
    name: profile.name,
    email: profile.email,
    phone: profile.phone,
    avatarUrl: profile.avatarUrl,
    salary: serializeDecimal(profile.salary),
    isActive: profile.isActive,
    invitedAt: serializeDate(profile.invitedAt),
    createdAt: serializeDate(profile.createdAt),
    updatedAt: serializeDate(profile.updatedAt),
  }
}
