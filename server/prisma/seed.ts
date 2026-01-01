import { PrismaClient, WorkspaceType, MemberRole, TransactionStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Create demo user
  const passwordHash = await bcrypt.hash('demo123', 10);
  
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@kinkyforex.com' },
    update: {},
    create: {
      email: 'demo@kinkyforex.com',
      name: 'Demo User',
      passwordHash,
      emailVerified: true,
    },
  });
  console.log('✅ Created demo user:', demoUser.email);

  // Create workspace
  const workspace = await prisma.workspace.create({
    data: {
      name: "Demo's Trading",
      type: WorkspaceType.SOLE_TRADER,
      members: {
        create: {
          userId: demoUser.id,
          role: MemberRole.OWNER,
          isOwner: true,
          profitSplit: 100,
        },
      },
      settings: {
        create: {
          defaultBuyRate: 15.42,
          defaultSellRate: 15.50,
        },
      },
    },
  });
  console.log('✅ Created workspace:', workspace.name);

  // Create cards
  const cards = await Promise.all([
    prisma.card.create({
      data: {
        workspaceId: workspace.id,
        name: 'BML Visa Gold',
        usdLimit: 500,
        color: '#F59E0B',
        isActive: true,
      },
    }),
    prisma.card.create({
      data: {
        workspaceId: workspace.id,
        name: 'MIB MasterCard',
        usdLimit: 750,
        color: '#3B82F6',
        isActive: true,
      },
    }),
    prisma.card.create({
      data: {
        workspaceId: workspace.id,
        name: 'SBI Rupay',
        usdLimit: 250,
        color: '#10B981',
        isActive: true,
      },
    }),
  ]);
  console.log('✅ Created', cards.length, 'cards');

  // Create sample transactions for last 3 months
  const transactions = [];
  const sites = ['Binance P2P', 'LocalBitcoins', 'Paxful', 'Direct Trade'];
  
  const now = new Date();
  for (let monthOffset = 0; monthOffset < 3; monthOffset++) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1);
    
    // Create 5-10 transactions per month
    const txCount = 5 + Math.floor(Math.random() * 6);
    
    for (let i = 0; i < txCount; i++) {
      const card = cards[Math.floor(Math.random() * cards.length)];
      const usdUsed = 50 + Math.floor(Math.random() * 200);
      const usdtReceived = usdUsed * (0.98 + Math.random() * 0.04); // 0.98-1.02 ratio
      const buyRate = 15.35 + Math.random() * 0.15; // 15.35-15.50
      const sellRate = 15.45 + Math.random() * 0.15; // 15.45-15.60
      
      const cost = usdUsed * buyRate;
      const sale = usdtReceived * sellRate;
      const profit = sale - cost;
      
      const day = 1 + Math.floor(Math.random() * 28);
      const transactionDate = new Date(monthDate.getFullYear(), monthDate.getMonth(), day);
      
      transactions.push({
        workspaceId: workspace.id,
        cardId: card.id,
        usdUsed: new Decimal(usdUsed.toFixed(2)),
        usdtReceived: new Decimal(usdtReceived.toFixed(8)),
        buyRate: new Decimal(buyRate.toFixed(4)),
        sellRate: new Decimal(sellRate.toFixed(4)),
        cost: new Decimal(cost.toFixed(2)),
        sale: new Decimal(sale.toFixed(2)),
        profit: new Decimal(profit.toFixed(2)),
        site: sites[Math.floor(Math.random() * sites.length)],
        status: TransactionStatus.COMPLETED,
        transactionDate,
      });
    }
  }

  await prisma.transaction.createMany({
    data: transactions,
  });
  console.log('✅ Created', transactions.length, 'transactions');

  // Create a partnership workspace with partner
  const partnerUser = await prisma.user.upsert({
    where: { email: 'partner@kinkyforex.com' },
    update: {},
    create: {
      email: 'partner@kinkyforex.com',
      name: 'Partner Demo',
      passwordHash,
      emailVerified: true,
    },
  });

  const partnerWorkspace = await prisma.workspace.create({
    data: {
      name: 'Trading Partners LLC',
      type: WorkspaceType.PARTNERSHIP,
      members: {
        create: [
          {
            userId: demoUser.id,
            role: MemberRole.OWNER,
            isOwner: true,
            profitSplit: 60,
          },
          {
            userId: partnerUser.id,
            role: MemberRole.MEMBER,
            isOwner: false,
            profitSplit: 40,
          },
        ],
      },
      settings: {
        create: {
          defaultBuyRate: 15.40,
          defaultSellRate: 15.55,
        },
      },
    },
  });
  console.log('✅ Created partnership workspace:', partnerWorkspace.name);

  console.log('\n🎉 Seed completed successfully!');
  console.log('\n📝 Demo credentials:');
  console.log('   Email: demo@kinkyforex.com');
  console.log('   Password: demo123');
  console.log('\n   Partner Email: partner@kinkyforex.com');
  console.log('   Password: demo123');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
