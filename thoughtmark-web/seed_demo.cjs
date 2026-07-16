/**
 * 创建演示用户 + 35 条真实书签（带注解和正文）
 * 用于 AI 功能巡检测试
 *
 * 书签覆盖多个主题领域：AI/前端/后端/数据库/DevOps
 * 带有分散的 createdAt 时间戳（模拟 4 个月的收藏行为）
 */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

const DEMO_EMAIL = process.env.DEMO_EMAIL || 'demo.user@example.com';
const DEMO_PASSWORD = process.env.DEMO_PASSWORD;

if (!DEMO_PASSWORD) {
  throw new Error('Set DEMO_PASSWORD before running this seed script.');
}

// 35 条真实 URL 书签，覆盖 5 个主题领域
const BOOKMARKS = [
  // ── AI / Machine Learning (8 条) ──
  { url: 'https://openai.com/research/gpt-4', title: 'GPT-4 Technical Report', whySaved: '了解 GPT-4 多模态能力和训练方法，比较与 GPT-3.5 的差异', tags: ['学习资料'], topic: 'AI', content: 'GPT-4 is a large multimodal model that accepts image and text inputs and produces text outputs. It exhibits human-level performance on various professional and academic benchmarks. GPT-4 uses a Transformer-based architecture trained with RLHF and demonstrates improved reasoning capabilities compared to prior models.' },
  { url: 'https://huggingface.co/docs/transformers/index', title: 'HuggingFace Transformers Documentation', whySaved: '学习 Transformers 库的基本用法，方便后续做 NLP 任务', tags: ['学习资料'], topic: 'AI', content: 'Transformers provides APIs and tools to easily download and fine-tune state-of-the-art pre-trained models. Using pretrained models can reduce compute costs, carbon footprint, and save time. Models support common tasks in text, vision and audio.' },
  { url: 'https://www.langchain.com/docs', title: 'LangChain Documentation - Build LLM Applications', whySaved: 'RAG 架构参考，尤其是 retrieval chain 的设计模式', tags: ['工作参考'], topic: 'AI', content: 'LangChain is a framework for developing applications powered by large language models. It enables context-aware applications that connect language models to sources of context including prompt instructions, few-shot examples, and content to ground responses.' },
  { url: 'https://arxiv.org/abs/2005.11401', title: 'Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks', whySaved: '经典 RAG 论文，理解检索增强生成的原理', tags: ['学习资料'], topic: 'AI', content: 'Large pre-trained language models have been shown to store factual knowledge in their parameters, and achieve state-of-the-art results when fine-tuned on downstream NLP tasks. This paper proposes the Retrieval-Augmented Generation model which combines pre-trained parametric and non-parametric memory for language generation.' },
  { url: 'https://platform.openai.com/docs/guides/embeddings', title: 'OpenAI Embeddings Guide', whySaved: '向量化最佳实践，了解 text-embedding-ada-002 的用法', tags: ['工作参考'], topic: 'AI', content: 'Embeddings are numerical representations of text that can be used to measure relatedness between text strings. OpenAI text embeddings measure the relatedness of text strings by converting text into floating-point vectors.' },
  { url: 'https://www.pinecone.io/learn/vector-database/', title: 'What is a Vector Database?', whySaved: '对比 Pinecone/pgvector/Milvus 的技术选型', tags: ['工作参考'], topic: 'AI', content: 'A vector database indexes and stores vector embeddings for fast retrieval and similarity search. Vector databases provide the ability to store and retrieve data as high-dimensional vectors which represent some underlying data.' },
  { url: 'https://jalammar.github.io/illustrated-transformer/', title: 'The Illustrated Transformer', whySaved: '用可视化方式理解 Transformer 架构，self-attention 机制', tags: ['学习资料'], topic: 'AI', content: 'The Transformer model uses self-attention to compute representations of its input and output without using sequence-aligned RNNs or convolution. The encoder maps input sequences to continuous representations, and the decoder generates output sequences one element at a time.' },
  { url: 'https://lilianweng.github.io/posts/2023-06-23-agent/', title: 'LLM Powered Autonomous Agents', whySaved: '理解 AI Agent 的规划和工具使用能力，对我们的产品有启发', tags: ['灵感收藏'], topic: 'AI', content: 'Building agents with LLM as its core controller involves components like planning, memory, and tool use. Agents can decompose large tasks into smaller subgoals, reflect and refine past actions, and leverage external tools for information retrieval and code execution.' },

  // ── Frontend / React (7 条) ──
  { url: 'https://react.dev/learn', title: 'React Documentation - Quick Start', whySaved: '复习 React 19 新特性，特别是 Server Components', tags: ['学习资料'], topic: 'Frontend', content: 'React lets you build user interfaces out of individual pieces called components. React components are JavaScript functions that return markup. You can create and nest components, add markup and styles, and display data.' },
  { url: 'https://nextjs.org/docs/app/building-your-application/routing', title: 'Next.js App Router Documentation', whySaved: 'App Router 路由设计参考，对比 Pages Router', tags: ['工作参考'], topic: 'Frontend', content: 'The Next.js App Router introduces a new model for building applications using React Server Components. With nested layouts, simplified data fetching, streaming, and built-in support for loading and error states.' },
  { url: 'https://tailwindcss.com/docs/utility-first', title: 'Tailwind CSS Utility-First Fundamentals', whySaved: '评估 Tailwind 的优缺点，决定是否在项目中使用', tags: ['工作参考'], topic: 'Frontend', content: 'Tailwind CSS is a utility-first CSS framework that provides low-level utility classes to build custom designs. Instead of pre-built components, you compose designs by applying utility classes directly in your HTML.' },
  { url: 'https://www.typescriptlang.org/docs/handbook/2/everyday-types.html', title: 'TypeScript Handbook - Everyday Types', whySaved: '复习 TS 类型系统基础，union types 和 narrowing', tags: ['学习资料'], topic: 'Frontend', content: 'TypeScript extends JavaScript with type syntax, providing a type system that describes the shapes and behaviors of what values can be. It includes everyday types like string, number, boolean, arrays, any, type annotations, union types, type aliases, interfaces.' },
  { url: 'https://www.framer.com/motion/', title: 'Framer Motion - Production-Ready Animations', whySaved: '动画库选型参考，看看能不能替代 CSS 动画', tags: ['灵感收藏'], topic: 'Frontend', content: 'Framer Motion is a production-ready motion library for React. It provides a simple declarative API for animations, gestures, layout animations, and more. Motion components extend standard HTML and SVG elements with animation capabilities.' },
  { url: 'https://zustand-demo.pmnd.rs/', title: 'Zustand - Bear Necessities for State Management', whySaved: '轻量状态管理评估，对比 Redux 和 Jotai', tags: ['工作参考'], topic: 'Frontend', content: 'Zustand is a small, fast and scalable state management solution using simplified flux principles. It has a comfy API based on hooks, is not boilerplaty, and does not require providers or wrappers.' },
  { url: 'https://web.dev/articles/vitals', title: 'Web Vitals - Essential Metrics for Web Performance', whySaved: '核心性能指标学习：LCP/FID/CLS，优化网页速度', tags: ['学习资料'], topic: 'Frontend', content: 'Core Web Vitals are a set of metrics that measure real-world user experience for loading performance, interactivity, and visual stability. They include Largest Contentful Paint (LCP), First Input Delay (FID), and Cumulative Layout Shift (CLS).' },

  // ── Backend / Node.js (7 条) ──
  { url: 'https://www.prisma.io/docs/getting-started', title: 'Prisma ORM Getting Started', whySaved: '项目数据库 ORM 选型，学习 Prisma schema 设计', tags: ['工作参考'], topic: 'Backend', content: 'Prisma is a next-generation ORM that provides a type-safe database client, migrations, and a GUI to explore data. It makes database access easy with an auto-generated and type-safe query builder.' },
  { url: 'https://redis.io/docs/getting-started/', title: 'Redis Documentation - Getting Started', whySaved: '学习 Redis 缓存策略和 BullMQ 队列依赖', tags: ['工作参考'], topic: 'Backend', content: 'Redis is an in-memory data store used as a database, cache, streaming engine, and message broker. It provides data structures such as strings, hashes, lists, sets, sorted sets with range queries, bitmaps, and streams.' },
  { url: 'https://next-auth.js.org/getting-started/introduction', title: 'NextAuth.js - Authentication for Next.js', whySaved: '认证方案参考，JWT vs Session 策略对比', tags: ['工作参考'], topic: 'Backend', content: 'NextAuth.js is a complete open-source authentication solution for Next.js applications. It is designed from the ground up to support Next.js and Serverless, supporting OAuth, email/passwordless, and credentials authentication.' },
  { url: 'https://docs.bullmq.io/', title: 'BullMQ - Premium Message Queue for Node.js', whySaved: '异步任务队列设计，用于 AI 聚类和 Embedding 处理', tags: ['工作参考'], topic: 'Backend', content: 'BullMQ is a Node.js library implementing a fast and robust queue system built on top of Redis. It provides features like job prioritization, scheduled jobs, concurrency settings, retries, and event-based processing.' },
  { url: 'https://www.postgresql.org/docs/current/indexes-types.html', title: 'PostgreSQL Index Types Documentation', whySaved: '学习不同索引类型，B-tree vs GIN vs GiST vs IVFFlat', tags: ['学习资料'], topic: 'Backend', content: 'PostgreSQL provides several index types: B-tree, Hash, GiST, SP-GiST, GIN, and BRIN. Each index type uses a different algorithm that is best suited to different types of queries. B-tree indexes are the most commonly used.' },
  { url: 'https://github.com/pgvector/pgvector', title: 'pgvector - Open-source vector similarity search for Postgres', whySaved: '向量搜索核心依赖，IVFFlat vs HNSW 索引对比', tags: ['工作参考'], topic: 'Backend', content: 'pgvector is an open-source vector similarity search extension for PostgreSQL. It supports exact and approximate nearest neighbor search, L2 distance, inner product, cosine distance, and provides IVFFlat and HNSW index types.' },
  { url: 'https://nodemailer.com/', title: 'Nodemailer - Send Emails from Node.js', whySaved: '邮件服务开发参考，QQ SMTP 配置', tags: ['工作参考'], topic: 'Backend', content: 'Nodemailer is a module for Node.js applications to allow easy email sending. It supports SMTP transport, HTML content, attachments, and various authentication methods including OAuth2 and custom credentials.' },

  // ── DevOps / 部署 (6 条) ──
  { url: 'https://docs.docker.com/get-started/', title: 'Docker Getting Started Tutorial', whySaved: '复习 Docker 基础，准备部署到阿里云', tags: ['学习资料'], topic: 'DevOps', content: 'Docker is a platform for developing, shipping, and running applications in containers. Containers are lightweight, standalone, and executable software packages that include everything needed to run an application.' },
  { url: 'https://docs.docker.com/compose/', title: 'Docker Compose Documentation', whySaved: '多容器编排配置参考，PostgreSQL + Redis + Web', tags: ['工作参考'], topic: 'DevOps', content: 'Docker Compose is a tool for defining and running multi-container Docker applications. With Compose, you use a YAML file to configure your application services, networks, and volumes.' },
  { url: 'https://docs.github.com/en/actions/quickstart', title: 'GitHub Actions Quickstart', whySaved: 'CI/CD 流水线设计，自动化测试和部署', tags: ['工作参考'], topic: 'DevOps', content: 'GitHub Actions makes it easy to automate all your software workflows with world-class CI/CD. Build, test, and deploy your code right from GitHub with workflow automation.' },
  { url: 'https://nginx.org/en/docs/beginners_guide.html', title: 'Nginx Beginner Guide', whySaved: '反向代理配置参考，SSL 和负载均衡', tags: ['学习资料'], topic: 'DevOps', content: 'Nginx is a web server that can also be used as a reverse proxy, load balancer, mail proxy and HTTP cache. It handles concurrent connections efficiently using an asynchronous, event-driven approach.' },
  { url: 'https://letsencrypt.org/getting-started/', title: "Let's Encrypt - Free SSL Certificates", whySaved: 'HTTPS 证书自动化，certbot 配置', tags: ['工作参考'], topic: 'DevOps', content: "Let's Encrypt is a free, automated, and open certificate authority that provides TLS/SSL certificates for websites. Certbot is a free, open source software tool that automates certificate issuance and renewal." },
  { url: 'https://pm2.keymetrics.io/docs/usage/quick-start/', title: 'PM2 Process Manager - Quick Start', whySaved: 'Node.js 进程守护方案评估，对比 PM2 和 Docker', tags: ['工作参考'], topic: 'DevOps', content: 'PM2 is a daemon process manager that will help you manage and keep your application online. PM2 allows you to keep applications alive forever, reload them without downtime, and facilitate common devops tasks.' },

  // ── 设计 / 产品灵感 (7 条) ──
  { url: 'https://dribbble.com/shots/popular', title: 'Dribbble - Discover the World Best Designers', whySaved: '寻找 UI 设计灵感，特别是暗色主题的设计趋势', tags: ['灵感收藏'], topic: 'Design', content: 'Dribbble is the leading destination to find and showcase creative work. Designers share screenshots of their work, process, and projects, providing inspiration for modern web and mobile design trends.' },
  { url: 'https://www.nngroup.com/articles/ten-usability-heuristics/', title: 'Nielsen 10 Usability Heuristics', whySaved: '产品可用性评估框架，自检 Thoughtmark 的设计', tags: ['学习资料'], topic: 'Design', content: 'Jakob Nielsen defined 10 general principles for interaction design. They are called heuristics because they are broad rules of thumb and not specific usability guidelines. These include visibility of system status, match between system and real world, user control and freedom.' },
  { url: 'https://lawsofux.com/', title: 'Laws of UX - A Collection of UX Principles', whySaved: 'UX 设计法则集锦，Fitts 定律和 Hick 定律很实用', tags: ['灵感收藏'], topic: 'Design', content: 'Laws of UX is a collection of best practices that designers can consider when building user interfaces. It includes principles like Fitts Law, Hick Law, Jakob Law, Miller Law, and the Peak-End Rule.' },
  { url: 'https://www.refactoringui.com/', title: 'Refactoring UI - Design Tips for Developers', whySaved: '开发者视角的设计建议，很实用', tags: ['灵感收藏'], topic: 'Design', content: 'Refactoring UI teaches developers how to design beautiful, professional interfaces. It covers layout, typography, color, depth, images, and other design fundamentals with practical, immediately actionable tips.' },
  { url: 'https://fonts.google.com/', title: 'Google Fonts - Free Web Font Library', whySaved: '字体选型参考，Inter/Outfit/JetBrains Mono', tags: ['工作参考'], topic: 'Design', content: 'Google Fonts is a library of open-source font families and APIs for convenient use via CSS. It makes web fonts fast and easy to use, providing optimized fonts with various styles and weights.' },
  { url: 'https://coolors.co/', title: 'Coolors - Color Palette Generator', whySaved: '配色方案生成工具，生成和谐的色彩组合', tags: ['灵感收藏'], topic: 'Design', content: 'Coolors is a super fast color scheme generator. Create the perfect palette or get inspired by thousands of beautiful color schemes. It provides tools for generating, adjusting, and exploring color combinations.' },
  { url: 'https://www.svgrepo.com/', title: 'SVG Repo - Free SVG Vectors and Icons', whySaved: '免费SVG图标资源，项目UI使用', tags: ['工作参考'], topic: 'Design', content: 'SVG Repo provides free SVG vectors and icons for your projects. Browse and find over 500,000 open-source SVG vectors with customizable styles including outline, filled, and two-tone variations.' },
];

async function main() {
  // 1. 检查/创建演示用户
  let user = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } });
  if (!user) {
    const hash = await bcrypt.hash(DEMO_PASSWORD, 12);
    user = await prisma.user.create({
      data: { email: DEMO_EMAIL, name: 'Demo 巡检用户', passwordHash: hash },
    });
    console.log('Created demo user:', user.id);
  } else {
    console.log('Demo user exists:', user.id);
  }

  // 2. 检查已有书签数
  const existing = await prisma.bookmark.count({ where: { userId: user.id } });
  if (existing >= 30) {
    console.log(`Demo user already has ${existing} bookmarks, skipping seed.`);
    return;
  }

  // 3. 批量创建书签（分散 createdAt 在最近 4 个月内）
  const now = new Date();
  for (let i = 0; i < BOOKMARKS.length; i++) {
    const bm = BOOKMARKS[i];
    // 分散时间：从 4 个月前到现在
    const daysAgo = Math.floor((BOOKMARKS.length - i) * (120 / BOOKMARKS.length));
    const createdAt = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);

    await prisma.bookmark.create({
      data: {
        userId: user.id,
        url: bm.url,
        title: bm.title,
        whySaved: bm.whySaved,
        quickTags: bm.tags,
        pageContent: bm.content,
        contentSummary: `[AI摘要] ${bm.content.substring(0, 100)}...`,
        createdAt,
      },
    });
    process.stdout.write('.');
  }
  console.log(`\nCreated ${BOOKMARKS.length} bookmarks for demo user.`);

  // 4. 汇总
  const total = await prisma.bookmark.count({ where: { userId: user.id } });
  console.log(`Demo user total bookmarks: ${total}`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma['$disconnect']());
