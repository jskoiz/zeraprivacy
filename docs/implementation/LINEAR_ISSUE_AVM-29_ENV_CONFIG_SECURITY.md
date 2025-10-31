# Linear Issue AVM-29: Implement Environment Configuration Security

## Title
**Implement Environment Configuration Security**

## Description

### Overview
Implement a secure, centralized environment configuration system for GhostSOL to ensure sensitive configuration values (API keys, RPC endpoints, encryption keys) are properly managed, validated, and protected from accidental exposure.

### Problem Statement
Currently, the GhostSOL SDK and example applications rely on environment variables without centralized validation, type safety, or security checks. This creates several risks:

1. **No validation**: Invalid or missing environment variables are only discovered at runtime
2. **No type safety**: Environment variables are accessed as strings without type checking
3. **Security risks**: Sensitive values may be accidentally logged or exposed
4. **Inconsistent access patterns**: Different parts of the codebase access env vars differently
5. **No documentation**: It's unclear which environment variables are required vs optional

### Objectives

#### 1. Centralized Environment Configuration
- Create a single source of truth for all environment variables
- Define schema/interface for all config values
- Support multiple environments (development, staging, production)
- Type-safe access to configuration values

#### 2. Validation & Security
- Validate all environment variables at initialization
- Type checking for numeric, boolean, and URL values
- Validate RPC endpoints are valid URLs
- Ensure sensitive values (private keys, API keys) are never logged
- Prevent accidental commits of `.env` files

#### 3. Developer Experience
- Clear error messages for missing or invalid variables
- Environment-specific defaults where appropriate
- Documentation for required vs optional variables
- Helpful setup instructions

#### 4. Runtime Security
- Mask sensitive values in logs/errors
- Prevent environment variables from being exposed in client-side code
- Validate configuration before SDK initialization
- Secure handling of private keys and encryption keys

### Implementation Requirements

#### Core Features
- [ ] Create environment configuration module (`sdk/src/core/env-config.ts`)
- [ ] Define TypeScript interface for all environment variables
- [ ] Implement validation functions for each config value type
- [ ] Add environment detection (dev/test/staging/prod)
- [ ] Implement secure config loader with masking for sensitive values
- [ ] Add configuration schema documentation

#### Security Features
- [ ] Validate RPC URLs are valid HTTPS endpoints (in production)
- [ ] Ensure private keys are never logged or exposed
- [ ] Mask sensitive values in error messages
- [ ] Prevent client-side exposure of server-only variables
- [ ] Validate environment-specific requirements

#### Integration
- [ ] Update SDK initialization to use validated config
- [ ] Update React provider to use secure config
- [ ] Update example Next.js app to use secure config
- [ ] Add configuration validation on SDK `init()`

#### Documentation
- [ ] Document all environment variables in `docs/SETUP.md`
- [ ] Add `.env.example` file with all variables documented
- [ ] Update security best practices documentation
- [ ] Add troubleshooting guide for common config errors

### Environment Variables to Support

#### Required Variables
- `SOLANA_CLUSTER` - Solana network (devnet/mainnet-beta)
- `SOLANA_RPC_URL` - Primary RPC endpoint URL

#### Optional Variables
- `SOLANA_RPC_URL_FALLBACK` - Fallback RPC endpoint
- `HELIUS_API_KEY` - Helius API key (if using Helius)
- `NEXT_PUBLIC_RPC_URL` - Public RPC URL for client-side (Next.js)
- `NEXT_PUBLIC_CLUSTER` - Public cluster for client-side

#### Security-Sensitive Variables
- `PRIVATE_KEY` - User wallet private key (NEVER log)
- `AUDITOR_KEY` - Auditor key for viewing keys (NEVER log)
- `ENCRYPTION_KEY` - Encryption keys for privacy features (NEVER log)

### Success Criteria

✅ **Centralized Configuration**
- All environment variables accessed through single module
- Type-safe interfaces for all config values

✅ **Validation**
- Missing required variables detected at startup
- Invalid values (bad URLs, wrong types) rejected with clear errors
- Environment-specific validation rules enforced

✅ **Security**
- Sensitive values never logged or exposed in errors
- Client-side code cannot access server-only variables
- `.env` files properly gitignored and documented

✅ **Developer Experience**
- Clear error messages guide developers to fix issues
- `.env.example` file provides template
- Documentation explains all variables and their purposes

✅ **Integration**
- SDK initialization validates config before proceeding
- Example applications use secure config system
- No breaking changes to existing API

### Technical Approach

1. **Create Config Module** (`sdk/src/core/env-config.ts`)
   ```typescript
   interface ZeraEnvConfig {
     cluster: 'devnet' | 'mainnet-beta';
     rpcUrl: string;
     rpcUrlFallback?: string;
     // ... other config
   }
   
   function loadAndValidateConfig(): ZeraEnvConfig
   ```

2. **Implement Validation**
   - Type validators (string, number, boolean, URL)
   - Required vs optional variable checking
   - Environment-specific rules (e.g., require HTTPS in production)

3. **Secure Access Pattern**
   - Mask sensitive values in logs
   - Separate server-side vs client-side variables
   - Runtime validation on SDK initialization

4. **Documentation**
   - Update `docs/SETUP.md` with new system
   - Create `.env.example` template
   - Add troubleshooting section

### Dependencies
- None - this is a foundational infrastructure improvement

### Related Issues
- May benefit from AVM-21 (Monitoring and Failover System) - can use validated RPC config
- May benefit from AVM-28 (Branch Alignment Review) - ensures consistent config usage

### References
- Current env var usage in `docs/SETUP.md` (lines 333-340)
- Security considerations in `docs/SETUP.md` (lines 342-348)
- `.gitignore` already excludes `.env*` files (lines 12-17)

---

**Branch**: `cursor/AVM-29-implement-env-config-security-a580`

