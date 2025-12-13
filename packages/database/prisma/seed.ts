import { PrismaClient, OrgPlan, OrgStatus, PlatformRole, UserStatus, OrgRole, ElectionStatus, VoteType, VerificationMode, ContestType } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password + 'salt').digest('hex');
}

function generateHash(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

async function main() {
  console.log('Seeding database...');

  // Create Super Admin User
  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@observernet.io' },
    update: {},
    create: {
      email: 'superadmin@observernet.io',
      emailVerified: new Date(),
      passwordHash: hashPassword('SuperAdmin123!'),
      firstName: 'Super',
      lastName: 'Admin',
      displayName: 'Platform Administrator',
      platformRole: PlatformRole.SUPERADMIN,
      status: UserStatus.ACTIVE,
      mfaEnabled: true,
    },
  });
  console.log('Created super admin:', superAdmin.email);

  // Create Demo Organization
  const demoOrg = await prisma.organization.upsert({
    where: { slug: 'demo-electoral-commission' },
    update: {},
    create: {
      name: 'Demo Electoral Commission',
      slug: 'demo-electoral-commission',
      description: 'A demonstration organization for testing the election platform',
      contactEmail: 'admin@demo-electoral.org',
      contactPhone: '+1-555-0100',
      country: 'US',
      timezone: 'America/New_York',
      plan: OrgPlan.PROFESSIONAL,
      maxElections: 50,
      maxVotersPerElection: 100000,
      maxAdmins: 20,
      status: OrgStatus.ACTIVE,
      verifiedAt: new Date(),
      primaryColor: '#2563EB',
      secondaryColor: '#1E40AF',
      features: JSON.stringify(['whatsapp', 'offline', 'ocr', 'analytics']),
    },
  });
  console.log('Created organization:', demoOrg.name);

  // Create Org Admin User
  const orgAdmin = await prisma.user.upsert({
    where: { email: 'admin@demo-electoral.org' },
    update: {},
    create: {
      email: 'admin@demo-electoral.org',
      emailVerified: new Date(),
      passwordHash: hashPassword('AdminPassword123!'),
      firstName: 'Election',
      lastName: 'Administrator',
      displayName: 'Election Admin',
      platformRole: PlatformRole.USER,
      status: UserStatus.ACTIVE,
    },
  });

  // Add org admin as member
  await prisma.orgMember.upsert({
    where: {
      userId_orgId: {
        userId: orgAdmin.id,
        orgId: demoOrg.id,
      },
    },
    update: {},
    create: {
      userId: orgAdmin.id,
      orgId: demoOrg.id,
      role: OrgRole.ADMIN,
      permissions: JSON.stringify(['*']),
    },
  });
  console.log('Created org admin:', orgAdmin.email);

  // Create Staff Users
  const staffMembers = [
    { email: 'manager@demo-electoral.org', firstName: 'Sarah', lastName: 'Manager', role: OrgRole.MANAGER },
    { email: 'staff@demo-electoral.org', firstName: 'John', lastName: 'Staff', role: OrgRole.STAFF },
    { email: 'observer@demo-electoral.org', firstName: 'Jane', lastName: 'Observer', role: OrgRole.OBSERVER },
  ];

  for (const member of staffMembers) {
    const user = await prisma.user.upsert({
      where: { email: member.email },
      update: {},
      create: {
        email: member.email,
        emailVerified: new Date(),
        passwordHash: hashPassword('Password123!'),
        firstName: member.firstName,
        lastName: member.lastName,
        platformRole: PlatformRole.USER,
        status: UserStatus.ACTIVE,
      },
    });

    await prisma.orgMember.upsert({
      where: {
        userId_orgId: {
          userId: user.id,
          orgId: demoOrg.id,
        },
      },
      update: {},
      create: {
        userId: user.id,
        orgId: demoOrg.id,
        role: member.role,
      },
    });
    console.log(`Created ${member.role}:`, member.email);
  }

  // Create Demo Election
  const now = new Date();
  const votingStart = new Date(now.getTime() - 24 * 60 * 60 * 1000); // Started yesterday
  const votingEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // Ends in 7 days

  const demoElection = await prisma.election.upsert({
    where: {
      orgId_slug: {
        orgId: demoOrg.id,
        slug: 'annual-board-election-2024',
      },
    },
    update: {},
    create: {
      orgId: demoOrg.id,
      createdById: orgAdmin.id,
      name: 'Annual Board Election 2024',
      slug: 'annual-board-election-2024',
      description: 'Election for the Board of Directors for the 2024-2025 term. All registered members are eligible to vote.',
      shortDescription: 'Board of Directors Election',
      type: 'STANDARD',
      voteType: VoteType.PLURALITY,
      votingStartAt: votingStart,
      votingEndAt: votingEnd,
      allowOffline: true,
      allowChannels: ['web', 'whatsapp', 'api'],
      verificationMode: VerificationMode.HYBRID,
      requireCaptcha: true,
      languages: ['en', 'es', 'fr'],
      status: ElectionStatus.VOTING_OPEN,
      publishedAt: new Date(now.getTime() - 48 * 60 * 60 * 1000),
      showVoterTurnout: true,
      showByChannel: true,
      primaryColor: '#2563EB',
    },
  });
  console.log('Created election:', demoElection.name);

  // Create Contests
  const presidentContest = await prisma.contest.create({
    data: {
      electionId: demoElection.id,
      title: 'President',
      description: 'Vote for the President of the Board',
      type: ContestType.CANDIDATE,
      minSelections: 1,
      maxSelections: 1,
      position: 1,
    },
  });

  const vpContest = await prisma.contest.create({
    data: {
      electionId: demoElection.id,
      title: 'Vice President',
      description: 'Vote for the Vice President of the Board',
      type: ContestType.CANDIDATE,
      minSelections: 1,
      maxSelections: 1,
      position: 2,
    },
  });

  const boardContest = await prisma.contest.create({
    data: {
      electionId: demoElection.id,
      title: 'Board Members',
      description: 'Vote for up to 3 Board Members',
      type: ContestType.CANDIDATE,
      minSelections: 0,
      maxSelections: 3,
      position: 3,
    },
  });

  const propositionContest = await prisma.contest.create({
    data: {
      electionId: demoElection.id,
      title: 'Proposition A: Budget Increase',
      description: 'Shall the annual budget be increased by 10% to fund new community programs?',
      type: ContestType.PROPOSITION,
      minSelections: 1,
      maxSelections: 1,
      position: 4,
    },
  });
  console.log('Created contests');

  // Create Candidates for President
  const presidentCandidates = [
    { title: 'Alice Johnson', party: 'Progressive Party', imageUrl: '/avatars/alice.jpg' },
    { title: 'Bob Smith', party: 'Conservative Party', imageUrl: '/avatars/bob.jpg' },
    { title: 'Carol Williams', party: 'Independent', imageUrl: '/avatars/carol.jpg' },
  ];

  for (let i = 0; i < presidentCandidates.length; i++) {
    await prisma.contestOption.create({
      data: {
        contestId: presidentContest.id,
        ...presidentCandidates[i],
        position: i + 1,
      },
    });
  }

  // Create Candidates for VP
  const vpCandidates = [
    { title: 'David Chen', party: 'Progressive Party' },
    { title: 'Eva Martinez', party: 'Conservative Party' },
  ];

  for (let i = 0; i < vpCandidates.length; i++) {
    await prisma.contestOption.create({
      data: {
        contestId: vpContest.id,
        ...vpCandidates[i],
        position: i + 1,
      },
    });
  }

  // Create Board Member Candidates
  const boardCandidates = [
    { title: 'Frank Brown' },
    { title: 'Grace Lee' },
    { title: 'Henry Wilson' },
    { title: 'Isabel Garcia' },
    { title: 'James Taylor' },
  ];

  for (let i = 0; i < boardCandidates.length; i++) {
    await prisma.contestOption.create({
      data: {
        contestId: boardContest.id,
        ...boardCandidates[i],
        position: i + 1,
      },
    });
  }

  // Create Proposition Options
  await prisma.contestOption.createMany({
    data: [
      { contestId: propositionContest.id, title: 'Yes', position: 1 },
      { contestId: propositionContest.id, title: 'No', position: 2 },
    ],
  });
  console.log('Created candidates and options');

  // Create Allowlist
  const allowlist = await prisma.allowlist.create({
    data: {
      electionId: demoElection.id,
      name: 'Registered Members 2024',
      description: 'All registered members eligible to vote',
      source: 'member_database_export.csv',
    },
  });

  // Create sample allowlist entries
  const sampleEmails = [
    'voter1@example.com',
    'voter2@example.com',
    'voter3@example.com',
    'voter4@example.com',
    'voter5@example.com',
  ];

  for (const email of sampleEmails) {
    const emailHash = generateHash(email);
    await prisma.allowlistEntry.create({
      data: {
        allowlistId: allowlist.id,
        emailHash,
        lookupKey: emailHash,
        verified: true,
      },
    });
  }
  console.log('Created allowlist with entries');

  // Create Access Codes
  const accessCodes = ['DEMO-001', 'DEMO-002', 'DEMO-003', 'DEMO-004', 'DEMO-005'];
  for (const code of accessCodes) {
    await prisma.accessCode.create({
      data: {
        electionId: demoElection.id,
        code,
        codeHash: generateHash(code),
        mode: 'SINGLE_USE',
        expiresAt: votingEnd,
      },
    });
  }
  console.log('Created access codes');

  // Create some sample voters and ballots
  for (let i = 1; i <= 50; i++) {
    const voterHash = generateHash(`voter-${i}-${Date.now()}`);
    const voter = await prisma.voter.create({
      data: {
        electionId: demoElection.id,
        voterHash,
        verificationMethod: VerificationMode.HYBRID,
        verifiedAt: new Date(),
        channel: i % 3 === 0 ? 'WHATSAPP' : i % 5 === 0 ? 'API' : 'WEB',
        status: 'VOTED',
        region: ['North', 'South', 'East', 'West'][i % 4],
      },
    });

    const commitmentHash = generateHash(`ballot-${voter.id}-${Date.now()}`);
    await prisma.ballot.create({
      data: {
        electionId: demoElection.id,
        voterId: voter.id,
        commitmentHash,
        channel: voter.channel,
        status: 'CONFIRMED',
        fabricTxId: `fabric-tx-${i.toString().padStart(4, '0')}`,
        submittedAt: new Date(now.getTime() - Math.random() * 24 * 60 * 60 * 1000),
        confirmedAt: new Date(),
      },
    });
  }
  console.log('Created sample voters and ballots');

  // Create Observers
  await prisma.observer.createMany({
    data: [
      {
        electionId: demoElection.id,
        name: 'International Election Monitor',
        email: 'monitor@iem.org',
        organization: 'International Election Monitors',
        accessToken: generateHash('observer-token-1'),
        permissions: ['view_results', 'view_turnout', 'export_results'],
        status: 'APPROVED',
        approvedBy: orgAdmin.id,
        approvedAt: new Date(),
      },
      {
        electionId: demoElection.id,
        name: 'Local Press',
        email: 'press@localnews.com',
        organization: 'Local News Network',
        accessToken: generateHash('observer-token-2'),
        permissions: ['view_results'],
        status: 'APPROVED',
        approvedBy: orgAdmin.id,
        approvedAt: new Date(),
      },
    ],
  });
  console.log('Created observers');

  // Create Announcements
  await prisma.announcement.createMany({
    data: [
      {
        electionId: demoElection.id,
        title: 'Voting is Now Open!',
        content: 'The polls are officially open. Cast your vote by visiting our secure voting portal or via WhatsApp.',
        type: 'INFO',
        publishAt: votingStart,
        createdBy: orgAdmin.id,
      },
      {
        electionId: demoElection.id,
        title: '3 Days Remaining',
        content: 'Reminder: Only 3 days left to cast your vote. Make your voice heard!',
        type: 'WARNING',
        publishAt: new Date(votingEnd.getTime() - 3 * 24 * 60 * 60 * 1000),
        createdBy: orgAdmin.id,
      },
    ],
  });
  console.log('Created announcements');

  // Create Audit Logs
  const auditActions = [
    { action: 'election.created', resource: 'election', resourceId: demoElection.id },
    { action: 'election.published', resource: 'election', resourceId: demoElection.id },
    { action: 'allowlist.imported', resource: 'allowlist', resourceId: allowlist.id },
    { action: 'codes.generated', resource: 'access_codes', resourceId: demoElection.id },
  ];

  let previousHash = '';
  for (const log of auditActions) {
    const hash = generateHash(`${previousHash}-${JSON.stringify(log)}-${Date.now()}`);
    await prisma.auditLog.create({
      data: {
        orgId: demoOrg.id,
        electionId: demoElection.id,
        userId: orgAdmin.id,
        ...log,
        previousHash: previousHash || null,
        hash,
      },
    });
    previousHash = hash;
  }
  console.log('Created audit logs');

  // Create System Config
  await prisma.systemConfig.upsert({
    where: { key: 'platform_settings' },
    update: {},
    create: {
      key: 'platform_settings',
      value: {
        maintenanceMode: false,
        allowNewOrganizations: true,
        defaultLanguage: 'en',
        supportedLanguages: ['en', 'es', 'fr', 'de', 'zh', 'ar'],
        maxUploadSizeMb: 50,
      },
      description: 'Global platform settings',
    },
  });

  // Create Feature Flags
  await prisma.featureFlag.upsert({
    where: { key: 'whatsapp_voting' },
    update: {},
    create: {
      key: 'whatsapp_voting',
      name: 'WhatsApp Voting',
      description: 'Enable voting via WhatsApp channel',
      enabled: true,
    },
  });

  await prisma.featureFlag.upsert({
    where: { key: 'ai_ocr_review' },
    update: {},
    create: {
      key: 'ai_ocr_review',
      name: 'AI OCR Review',
      description: 'Use AI to review OCR results for paper ballots',
      enabled: true,
    },
  });
  console.log('Created system config and feature flags');

  console.log('Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
