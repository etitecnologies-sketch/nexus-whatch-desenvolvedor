# Contributing to Nexus Watch

Thank you for your interest in contributing to Nexus Watch! This document provides guidelines and instructions for contributing to the project.

## Code of Conduct

Be respectful, inclusive, and professional in all interactions. We are committed to providing a welcoming and harassment-free environment.

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 10+
- MySQL 8.0+ or TiDB
- Git

### Development Setup

1. **Fork the repository**
```bash
git clone https://github.com/your-username/Nexus-Watch.git
cd Nexus-Watch
```

2. **Create a feature branch**
```bash
git checkout -b feature/your-feature-name
```

3. **Install dependencies**
```bash
pnpm install
```

4. **Setup environment**
```bash
cp .env.example .env.local
# Edit .env.local with your configuration
```

5. **Start development server**
```bash
pnpm dev
```

## Development Workflow

### 1. Making Changes

- Keep changes focused and atomic
- Follow the existing code style
- Write clear, descriptive commit messages
- Test your changes thoroughly

### 2. Code Style

We use Prettier for code formatting and ESLint for linting.

```bash
# Format code
pnpm format

# Check for linting errors
pnpm check
```

### 3. Database Changes

If you modify the database schema:

1. Update `drizzle/schema.ts`
2. Generate migrations: `pnpm drizzle-kit generate`
3. Apply migrations: `pnpm drizzle-kit migrate`
4. Include migration files in your PR

### 4. Testing

Write tests for new features:

```bash
# Run tests
pnpm test

# Watch mode
pnpm test --watch
```

Test files should be named `*.test.ts` and located in the same directory as the code being tested.

### 5. Type Safety

Ensure TypeScript compilation passes:

```bash
pnpm check
```

## Commit Guidelines

Use clear, descriptive commit messages following the conventional commits format:

```
type(scope): description

[optional body]

[optional footer]
```

Types:
- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Build, dependencies, tooling

Examples:
```
feat(live-view): add support for 16-camera grid layout
fix(playback): resolve timeline sync issue with multiple cameras
docs(setup): add Hikvision integration guide
```

## Pull Request Process

1. **Ensure your branch is up to date**
```bash
git fetch origin
git rebase origin/main
```

2. **Push your changes**
```bash
git push origin feature/your-feature-name
```

3. **Create a Pull Request**
   - Use a clear, descriptive title
   - Reference related issues
   - Describe what changes you made and why
   - Include screenshots for UI changes

4. **PR Template**
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Related Issues
Closes #123

## Testing
Describe how you tested these changes

## Screenshots (if applicable)
Add screenshots for UI changes

## Checklist
- [ ] Code follows style guidelines
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No breaking changes
```

5. **Address Review Comments**
   - Respond to all feedback
   - Make requested changes
   - Re-request review when ready

## Feature Development

### Adding a New Vendor Driver

1. **Create driver class** implementing `IDeviceDriver` interface
2. **Register in factory** pattern in `server/drivers/factory.ts`
3. **Add tests** in `server/drivers/vendor.test.ts`
4. **Update documentation** in `docs/setup/vendor.md`
5. **Add to comparison table** in README.md

### Adding a New Feature

1. **Update database schema** if needed
2. **Create backend procedures** in `server/routers.ts`
3. **Create frontend components** in `client/src/pages/` or `client/src/components/`
4. **Write tests** for both backend and frontend
5. **Update documentation**
6. **Create PR** with detailed description

## Documentation

Documentation should be:
- Clear and concise
- Include examples where applicable
- Keep up-to-date with code changes
- Use markdown formatting

Documentation files are located in:
- `docs/` - User and developer guides
- `docs/setup/` - Vendor-specific setup guides
- `README.md` - Project overview
- Code comments - For complex logic

## Reporting Issues

### Bug Reports

Include:
- Clear description of the bug
- Steps to reproduce
- Expected behavior
- Actual behavior
- Screenshots/logs if applicable
- Environment (OS, browser, Node version, etc.)

### Feature Requests

Include:
- Clear description of the feature
- Use case and motivation
- Proposed implementation (if applicable)
- Examples or mockups

## Performance Considerations

When contributing, consider:
- Database query efficiency
- API response times
- Frontend rendering performance
- Memory usage
- Network bandwidth

## Security

- Never commit secrets or credentials
- Use environment variables for sensitive data
- Validate and sanitize all user inputs
- Follow OWASP guidelines
- Report security issues privately to maintainers

## Project Structure

```
nexus-watch/
├── client/                 # React frontend
│   ├── src/
│   │   ├── pages/         # Page components
│   │   ├── components/    # Reusable components
│   │   ├── lib/           # Utilities
│   │   └── index.css      # Global styles
│   └── public/            # Static assets
├── server/                # Express backend
│   ├── routers.ts         # tRPC procedures
│   ├── db.ts              # Database queries
│   ├── drivers/           # Vendor drivers
│   └── _core/             # Framework code
├── drizzle/               # Database schema
├── docs/                  # Documentation
├── shared/                # Shared types
└── package.json
```

## Questions?

- Check existing [issues](https://github.com/etitecnologies-sketch/Nexus-Watch/issues)
- Read [documentation](./docs)
- Start a [discussion](https://github.com/etitecnologies-sketch/Nexus-Watch/discussions)
- Email: support@etitecnologies.com

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to Nexus Watch! 🎉
