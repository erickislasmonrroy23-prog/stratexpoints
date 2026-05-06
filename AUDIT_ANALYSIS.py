#!/usr/bin/env python3
"""
STRATEXPOINTS - AUDIT COMPLETO Y PLAN DE FASES
Análisis exhaustivo de la codebase para convertir a SAAS production-ready
"""

import os
import json
import re
from pathlib import Path
from collections import defaultdict
from datetime import datetime

class StratexPointsAudit:
    def __init__(self, root_path):
        self.root = Path(root_path)
        self.issues = defaultdict(list)
        self.metrics = {
            'total_files': 0,
            'js_files': 0,
            'jsx_files': 0,
            'ts_files': 0,
            'total_lines': 0,
        }
        self.components = []
        self.edge_functions = []
        self.security_issues = []
        self.performance_issues = []
        self.architecture_issues = []

    def scan_project(self):
        """Escanea toda la codebase"""
        print("🔍 ESCANEANDO PROYECTO COMPLETO...")

        # Contar archivos
        for ext, count_key in [('.js', 'js_files'), ('.jsx', 'jsx_files'), ('.ts', 'ts_files')]:
            files = list(self.root.rglob(f'*{ext}'))
            self.metrics[count_key] = len(files)
            self.metrics['total_files'] += len(files)

        # Analizar archivos críticos
        self.analyze_critical_files()
        self.analyze_package_json()
        self.analyze_env_config()
        self.analyze_security()
        self.analyze_performance()
        self.analyze_architecture()

    def analyze_critical_files(self):
        """Analiza archivos críticos"""
        critical = [
            'src/App.jsx',
            'src/store.js',
            'src/supabase.js',
            'src/authSlice.js',
            'src/utils/jwtUtils.js',
            'package.json',
            '.env.local'
        ]

        for file in critical:
            path = self.root / file
            if path.exists():
                with open(path, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                    self.metrics['total_lines'] += len(content.split('\n'))
                    self.check_file_issues(file, content)

    def check_file_issues(self, filename, content):
        """Detecta problemas en archivos"""

        # SEGURIDAD: API Keys expuestas
        if 'SUPABASE_KEY' in content or 'sk_' in content or 'pk_' in content:
            if '.env' not in filename and '.local' not in filename:
                self.security_issues.append(
                    f"⚠️  {filename}: Posible exposición de API Keys"
                )

        # SEGURIDAD: console.log en producción
        log_count = len(re.findall(r'console\.(log|warn|error)', content))
        if log_count > 10 and filename.endswith('.jsx'):
            self.security_issues.append(
                f"⚠️  {filename}: {log_count} console logs (posible data leak en producción)"
            )

        # ARQUITECTURA: fetch sin try-catch
        if 'fetch(' in content and content.count('try') < content.count('fetch('):
            self.architecture_issues.append(
                f"❌ {filename}: fetch() sin manejo de errores"
            )

        # PERFORMANCE: Componentes muy grandes
        lines = content.split('\n')
        if len(lines) > 500 and filename.endswith('.jsx'):
            self.performance_issues.append(
                f"📊 {filename}: Componente muy grande ({len(lines)} líneas) - considerar split"
            )

        # ARCHITECTURE: Estado global sin context
        if 'localStorage' in content and 'useStore' not in content:
            self.architecture_issues.append(
                f"⚠️  {filename}: Usa localStorage sin sincronización con store"
            )

    def analyze_package_json(self):
        """Analiza dependencias"""
        pkg_path = self.root / 'package.json'
        if pkg_path.exists():
            with open(pkg_path) as f:
                pkg = json.load(f)

            # Buscar dependencias desactualizadas o conflictivas
            deps = pkg.get('dependencies', {})

            if 'react' in deps:
                # Revisar versiones
                critical_deps = [
                    'react', 'react-dom', 'zustand', '@supabase/supabase-js'
                ]
                for dep in critical_deps:
                    if dep not in deps:
                        self.architecture_issues.append(
                            f"❌ Falta dependencia crítica: {dep}"
                        )

    def analyze_env_config(self):
        """Analiza configuración de ambiente"""
        env_path = self.root / '.env.local'
        if env_path.exists():
            with open(env_path) as f:
                env_content = f.read()

            required_vars = [
                'VITE_SUPABASE_URL',
                'VITE_SUPABASE_ANON_KEY',
                'SERVICE_ROLE_KEY'
            ]

            for var in required_vars:
                if var not in env_content:
                    self.security_issues.append(
                        f"⚠️  Falta variable de ambiente: {var}"
                    )

    def analyze_security(self):
        """Análisis de seguridad"""
        security_checks = {
            'RLS_POLICIES': 'supabase/migrations',
            'JWT_VERIFICATION': 'src',
            'PASSWORD_HASHING': 'src',
            'RATE_LIMITING': 'supabase/functions',
        }

        for check, path in security_checks.items():
            check_path = self.root / path
            if check_path.exists():
                content = '\n'.join([
                    open(f, encoding='utf-8', errors='ignore').read()
                    for f in check_path.rglob('*')
                    if f.is_file() and f.suffix in ['.js', '.ts', '.jsx', '.sql']
                ])

                if 'enable_rls' not in content.lower():
                    self.security_issues.append(
                        f"❌ RLS policies no implementadas correctamente"
                    )

    def analyze_performance(self):
        """Análisis de performance"""
        # Buscar mejoras posibles
        improvements = [
            ("Lazy loading", "React.lazy", "src"),
            ("Code splitting", "import()", "src"),
            ("Caching", "React.memo", "src"),
            ("Virtual lists", "virtualized", "src"),
        ]

        for improvement, pattern, path in improvements:
            check_path = self.root / path
            if check_path.exists():
                files_with_pattern = 0
                for file in check_path.rglob('*.jsx'):
                    try:
                        with open(file, encoding='utf-8', errors='ignore') as f:
                            if pattern in f.read():
                                files_with_pattern += 1
                    except:
                        pass

                if files_with_pattern == 0:
                    self.performance_issues.append(
                        f"📊 Oportunidad: Implementar {improvement} ({pattern})"
                    )

    def analyze_architecture(self):
        """Análisis arquitectónico para SAAS"""
        saas_requirements = {
            'Multi-tenancy': ['organization_id', 'tenant_id'],
            'User Management': ['user_roles', 'permissions'],
            'Billing': ['subscription', 'payment'],
            'Audit Logs': ['audit_log', 'activity_log'],
            'Data Isolation': ['rls_policies', 'organization_scope'],
        }

        content = '\n'.join([
            open(f, encoding='utf-8', errors='ignore').read()
            for f in self.root.rglob('*.js*')
            if f.is_file()
        ])

        for feature, indicators in saas_requirements.items():
            found = any(indicator in content for indicator in indicators)
            if not found:
                self.architecture_issues.append(
                    f"⚠️  SAAS Feature faltante: {feature}"
                )

    def generate_report(self):
        """Genera reporte completo"""
        return {
            'timestamp': datetime.now().isoformat(),
            'metrics': self.metrics,
            'security_issues': self.security_issues,
            'performance_issues': self.performance_issues,
            'architecture_issues': self.architecture_issues,
        }

def generate_phase_plan():
    """Genera el plan de fases de mejora"""

    plan = {
        'FASE_1_CRÍTICA': {
            'nombre': '🔴 REPARACIONES CRÍTICAS (1-2 semanas)',
            'prioridad': 'INMEDIATA',
            'tareas': [
                {
                    'id': '1.1',
                    'título': 'Crear /change-password route',
                    'descripción': 'Implementar componente ChangePassword.jsx para password rotation',
                    'archivos': ['src/components/Auth/ChangePassword.jsx', 'src/App.jsx'],
                    'complejidad': 'MEDIA',
                    'tiempo': '2 horas',
                    'bloqueante': True
                },
                {
                    'id': '1.2',
                    'título': 'Completar logout functionality',
                    'descripción': 'Verificar y mejorar logout en todos los módulos',
                    'archivos': ['src/App.jsx', 'src/store.js'],
                    'complejidad': 'BAJA',
                    'tiempo': '1 hora',
                    'bloqueante': True
                },
                {
                    'id': '1.3',
                    'título': 'Implementar Protected Routes',
                    'descripción': 'Crear wrapper para rutas protegidas con verificación de auth',
                    'archivos': ['src/components/ProtectedRoute.jsx', 'src/App.jsx'],
                    'complejidad': 'MEDIA',
                    'tiempo': '3 horas',
                    'bloqueante': True
                },
                {
                    'id': '1.4',
                    'título': 'Fix console.log en producción',
                    'descripción': 'Remover/condicionalizar todos los console logs',
                    'archivos': ['src/**/*.jsx', 'src/**/*.js'],
                    'complejidad': 'MEDIA',
                    'tiempo': '4 horas',
                    'bloqueante': False
                },
                {
                    'id': '1.5',
                    'título': 'Verificar Error Handling',
                    'descripción': 'Agregar try-catch a todas las llamadas de API',
                    'archivos': ['src/**/*.jsx', 'src/**/*.js'],
                    'complejidad': 'ALTA',
                    'tiempo': '6 horas',
                    'bloqueante': True
                },
            ]
        },
        'FASE_2_SEGURIDAD': {
            'nombre': '🛡️ ENDURECIMIENTO DE SEGURIDAD (2-3 semanas)',
            'prioridad': 'ALTA',
            'tareas': [
                {
                    'id': '2.1',
                    'título': 'Implementar Rate Limiting',
                    'descripción': 'Agregar rate limiting en login y API calls',
                    'archivos': ['supabase/functions/auth-context/index.ts', 'src/utils/jwtUtils.js'],
                    'complejidad': 'MEDIA',
                    'tiempo': '4 horas',
                    'bloqueante': False
                },
                {
                    'id': '2.2',
                    'título': 'Agregar CSRF Protection',
                    'descripción': 'Implementar CSRF tokens en formularios',
                    'archivos': ['src/components/**/*.jsx', 'src/utils/csrfUtils.js'],
                    'complejidad': 'MEDIA',
                    'tiempo': '3 horas',
                    'bloqueante': False
                },
                {
                    'id': '2.3',
                    'título': 'Validar RLS Policies',
                    'descripción': 'Revisar y mejorar Row Level Security en Supabase',
                    'archivos': ['supabase/migrations/**/*.sql'],
                    'complejidad': 'ALTA',
                    'tiempo': '6 horas',
                    'bloqueante': True
                },
                {
                    'id': '2.4',
                    'título': 'Implementar 2FA/MFA',
                    'descripción': 'Agregar autenticación multifactor con TOTP',
                    'archivos': ['src/components/Auth/MFA.jsx', 'supabase/functions/verify-otp/index.ts'],
                    'complejidad': 'ALTA',
                    'tiempo': '8 horas',
                    'bloqueante': False
                },
                {
                    'id': '2.5',
                    'título': 'Audit Logging completo',
                    'descripción': 'Registrar todas las acciones críticas del usuario',
                    'archivos': ['supabase/functions/audit-log/index.ts', 'src/utils/auditUtils.js'],
                    'complejidad': 'MEDIA',
                    'tiempo': '5 horas',
                    'bloqueante': False
                },
            ]
        },
        'FASE_3_ARQUITECTURA_SAAS': {
            'nombre': '🏢 ARQUITECTURA SAAS MULTI-EMPRESA (3-4 semanas)',
            'prioridad': 'ALTA',
            'tareas': [
                {
                    'id': '3.1',
                    'título': 'Implementar Multi-Tenancy completo',
                    'descripción': 'Garantizar isolation de datos por organización en todas las queries',
                    'archivos': ['src/utils/tenantUtils.js', 'src/store.js', 'supabase/migrations/010-tenant-isolation.sql'],
                    'complejidad': 'ALTA',
                    'tiempo': '10 horas',
                    'bloqueante': True
                },
                {
                    'id': '3.2',
                    'título': 'Sistema de Roles y Permisos',
                    'descripción': 'Implementar RBAC/ABAC completo con granularidad fina',
                    'archivos': ['src/utils/permissionUtils.js', 'src/hooks/usePermissions.js', 'supabase/migrations/011-rbac.sql'],
                    'complejidad': 'ALTA',
                    'tiempo': '12 horas',
                    'bloqueante': True
                },
                {
                    'id': '3.3',
                    'título': 'Gestión de Usuarios y Invitaciones',
                    'descripción': 'CRUD de usuarios, invitaciones, asignación de roles',
                    'archivos': ['src/components/Admin/UserManagement.jsx', 'supabase/functions/invite-user/index.ts'],
                    'complejidad': 'MEDIA',
                    'tiempo': '8 horas',
                    'bloqueante': False
                },
                {
                    'id': '3.4',
                    'título': 'Integración de Billing y Subscripciones',
                    'descripción': 'Integrar Stripe/Paddle para planes y pagos',
                    'archivos': ['src/components/Billing/SubscriptionManager.jsx', 'supabase/functions/billing-webhook/index.ts'],
                    'complejidad': 'ALTA',
                    'tiempo': '15 horas',
                    'bloqueante': False
                },
                {
                    'id': '3.5',
                    'título': 'Subdomain Routing por Tenant',
                    'descripción': 'Implementar routing por subdominio (tenant.app.com)',
                    'archivos': ['src/utils/subdomainUtils.js', 'vite.config.js'],
                    'complejidad': 'MEDIA',
                    'tiempo': '6 horas',
                    'bloqueante': False
                },
                {
                    'id': '3.6',
                    'título': 'Settings por Organización',
                    'descripción': 'Panel de configuración por empresa (branding, integraciones, etc)',
                    'archivos': ['src/components/Admin/OrganizationSettings.jsx'],
                    'complejidad': 'MEDIA',
                    'tiempo': '7 horas',
                    'bloqueante': False
                },
            ]
        },
        'FASE_4_PERFORMANCE': {
            'nombre': '⚡ OPTIMIZACIÓN DE PERFORMANCE (2-3 semanas)',
            'prioridad': 'MEDIA',
            'tareas': [
                {
                    'id': '4.1',
                    'título': 'Lazy Loading de Componentes',
                    'descripción': 'Implementar code splitting con React.lazy en módulos grandes',
                    'archivos': ['src/App.jsx', 'src/**/*.jsx'],
                    'complejidad': 'MEDIA',
                    'tiempo': '6 horas',
                    'bloqueante': False
                },
                {
                    'id': '4.2',
                    'título': 'Caching Inteligente',
                    'descripción': 'Implementar React Query/SWR con estrategias de cache',
                    'archivos': ['src/utils/queryClient.js', 'src/hooks/useQuery.js'],
                    'complejidad': 'MEDIA',
                    'tiempo': '8 horas',
                    'bloqueante': False
                },
                {
                    'id': '4.3',
                    'título': 'Optimizar Bundle Size',
                    'descripción': 'Analizar y reducir dependencies innecesarias',
                    'archivos': ['package.json', 'vite.config.js'],
                    'complejidad': 'MEDIA',
                    'tiempo': '5 horas',
                    'bloqueante': False
                },
                {
                    'id': '4.4',
                    'título': 'Database Query Optimization',
                    'descripción': 'Revisar todas las queries, agregar indexes, evitar N+1',
                    'archivos': ['supabase/migrations/**/*.sql', 'src/**/*.js'],
                    'complejidad': 'ALTA',
                    'tiempo': '10 horas',
                    'bloqueante': False
                },
                {
                    'id': '4.5',
                    'título': 'Implementar Virtual Scrolling',
                    'descripción': 'Para listas grandes (usuarios, registros, etc)',
                    'archivos': ['src/components/**/*.jsx'],
                    'complejidad': 'MEDIA',
                    'tiempo': '4 horas',
                    'bloqueante': False
                },
            ]
        },
        'FASE_5_TESTING': {
            'nombre': '✅ TESTING Y QA (2-3 semanas)',
            'prioridad': 'MEDIA',
            'tareas': [
                {
                    'id': '5.1',
                    'título': 'Unit Tests',
                    'descripción': 'Agregar Jest + React Testing Library para componentes críticos',
                    'archivos': ['src/**/__tests__/*.test.jsx', 'jest.config.js'],
                    'complejidad': 'MEDIA',
                    'tiempo': '12 horas',
                    'bloqueante': False
                },
                {
                    'id': '5.2',
                    'título': 'Integration Tests',
                    'descripción': 'Tests de flujos críticos (auth, billing, data)',
                    'archivos': ['__tests__/integration/**/*.test.js'],
                    'complejidad': 'MEDIA',
                    'tiempo': '10 horas',
                    'bloqueante': False
                },
                {
                    'id': '5.3',
                    'título': 'E2E Tests mejorados',
                    'descripción': 'Expandir E2E_TEST_SCRIPT.js con Playwright/Cypress',
                    'archivos': ['e2e/**/*.spec.js', 'playwright.config.js'],
                    'complejidad': 'MEDIA',
                    'tiempo': '10 horas',
                    'bloqueante': False
                },
                {
                    'id': '5.4',
                    'título': 'Load Testing',
                    'descripción': 'Pruebas de carga con k6/Artillery',
                    'archivos': ['load-tests/**/*.js'],
                    'complejidad': 'MEDIA',
                    'tiempo': '8 horas',
                    'bloqueante': False
                },
                {
                    'id': '5.5',
                    'título': 'Security Testing',
                    'descripción': 'OWASP testing, vulnerabilities scanning',
                    'archivos': ['security-tests/**/*.js'],
                    'complejidad': 'ALTA',
                    'tiempo': '12 horas',
                    'bloqueante': False
                },
            ]
        },
        'FASE_6_DEPLOYMENT': {
            'nombre': '🚀 PREPARACIÓN PARA PRODUCCIÓN (1-2 semanas)',
            'prioridad': 'ALTA',
            'tareas': [
                {
                    'id': '6.1',
                    'título': 'CI/CD Pipeline',
                    'descripción': 'Configurar GitHub Actions para testing y deployment automático',
                    'archivos': ['.github/workflows/**/*.yml'],
                    'complejidad': 'MEDIA',
                    'tiempo': '6 horas',
                    'bloqueante': True
                },
                {
                    'id': '6.2',
                    'título': 'Environment Configuration',
                    'descripción': 'Configurar dev, staging, production environments',
                    'archivos': ['.env.example', '.env.staging', '.env.production'],
                    'complejidad': 'BAJA',
                    'tiempo': '3 horas',
                    'bloqueante': True
                },
                {
                    'id': '6.3',
                    'título': 'Monitoring y Logging',
                    'descripción': 'Integrar Sentry, LogRocket, CloudWatch',
                    'archivos': ['src/utils/monitoring.js'],
                    'complejidad': 'MEDIA',
                    'tiempo': '6 horas',
                    'bloqueante': False
                },
                {
                    'id': '6.4',
                    'título': 'Database Backups y Recovery',
                    'descripción': 'Configurar automatic backups en Supabase',
                    'archivos': ['supabase/backup-strategy.md'],
                    'complejidad': 'BAJA',
                    'tiempo': '2 horas',
                    'bloqueante': True
                },
                {
                    'id': '6.5',
                    'título': 'Documentation',
                    'descripción': 'Documentación completa de API, componentes, deployment',
                    'archivos': ['docs/**/*.md'],
                    'complejidad': 'BAJA',
                    'tiempo': '8 horas',
                    'bloqueante': False
                },
                {
                    'id': '6.6',
                    'título': 'Disaster Recovery Plan',
                    'descripción': 'Plan de recuperación ante desastres',
                    'archivos': ['docs/disaster-recovery.md'],
                    'complejidad': 'MEDIA',
                    'tiempo': '4 horas',
                    'bloqueante': False
                },
            ]
        },
        'FASE_7_FEATURES_AVANZADAS': {
            'nombre': '🎯 FEATURES AVANZADAS (Ongoing)',
            'prioridad': 'BAJA',
            'tareas': [
                {
                    'id': '7.1',
                    'título': 'SSO / OAuth Integrations',
                    'descripción': 'Google, Microsoft, GitHub, custom SAML',
                    'archivos': ['supabase/functions/oauth-callback/index.ts'],
                    'complejidad': 'ALTA',
                    'tiempo': '12 horas',
                    'bloqueante': False
                },
                {
                    'id': '7.2',
                    'título': 'API Pública con Rate Limiting',
                    'descripción': 'Exponer API REST con documentation (OpenAPI/Swagger)',
                    'archivos': ['src/api/**/*.js', 'docs/api.openapi.yml'],
                    'complejidad': 'ALTA',
                    'tiempo': '15 horas',
                    'bloqueante': False
                },
                {
                    'id': '7.3',
                    'título': 'Webhooks y Integraciones',
                    'descripción': 'Sistema de webhooks para eventos importantes',
                    'archivos': ['supabase/functions/webhook-dispatcher/index.ts'],
                    'complejidad': 'MEDIA',
                    'tiempo': '10 horas',
                    'bloqueante': False
                },
                {
                    'id': '7.4',
                    'título': 'White-label / Custom Branding',
                    'descripción': 'Soporte para custom domains, logos, colores por tenant',
                    'archivos': ['src/components/Branding/**/*.jsx'],
                    'complejidad': 'MEDIA',
                    'tiempo': '8 horas',
                    'bloqueante': False
                },
                {
                    'id': '7.5',
                    'título': 'Advanced Analytics',
                    'descripción': 'Analytics de uso, heatmaps, user behavior tracking',
                    'archivos': ['src/components/Analytics/**/*.jsx'],
                    'complejidad': 'ALTA',
                    'tiempo': '15 horas',
                    'bloqueante': False
                },
            ]
        }
    }

    return plan

if __name__ == '__main__':
    print("=" * 80)
    print("🔍 STRATEXPOINTS - AUDIT EXHAUSTIVO Y PLAN DE FASES")
    print("=" * 80)

    # Ejecutar audit
    root_path = Path(__file__).parent
    audit = StratexPointsAudit(root_path)
    audit.scan_project()
    report = audit.generate_report()

    # Mostrar métricas
    print("\n📊 MÉTRICAS DEL PROYECTO:")
    print(f"  Total de archivos: {report['metrics']['total_files']}")
    print(f"  Archivos JS: {report['metrics']['js_files']}")
    print(f"  Archivos JSX: {report['metrics']['jsx_files']}")
    print(f"  Archivos TS: {report['metrics']['ts_files']}")
    print(f"  Total de líneas: {report['metrics']['total_lines']:,}")

    # Mostrar issues
    if report['security_issues']:
        print("\n🛡️ ISSUES DE SEGURIDAD ({})".format(len(report['security_issues'])))
        for issue in report['security_issues']:
            print(f"  {issue}")

    if report['architecture_issues']:
        print("\n🏗️  ISSUES DE ARQUITECTURA ({})".format(len(report['architecture_issues'])))
        for issue in report['architecture_issues']:
            print(f"  {issue}")

    if report['performance_issues']:
        print("\n⚡ OPORTUNIDADES DE PERFORMANCE ({})".format(len(report['performance_issues'])))
        for issue in report['performance_issues'][:5]:  # Top 5
            print(f"  {issue}")

    # Generar plan de fases
    plan = generate_phase_plan()

    print("\n" + "=" * 80)
    print("📋 PLAN COMPLETO DE FASES")
    print("=" * 80)

    total_horas = 0
    for phase_key, phase in plan.items():
        print(f"\n{phase['nombre']}")
        print(f"Prioridad: {phase['prioridad']}")
        print(f"Tareas: {len(phase['tareas'])}")

        horas_fase = 0
        for tarea in phase['tareas']:
            # Extraer horas
            tiempo_str = tarea['tiempo']
            if 'hora' in tiempo_str:
                horas = int(tiempo_str.split()[0])
                horas_fase += horas
                total_horas += horas

        print(f"Estimado: {horas_fase} horas ({horas_fase/8:.1f} días de trabajo)")

        for tarea in phase['tareas']:
            bloqueante = "🔴" if tarea['bloqueante'] else "🟡"
            print(f"  {bloqueante} {tarea['id']}: {tarea['título']} ({tarea['tiempo']})")

    print("\n" + "=" * 80)
    print(f"⏱️  TIEMPO TOTAL ESTIMADO: {total_horas} horas ({total_horas/40:.1f} semanas 40h/week)")
    print("=" * 80)

    # Guardar reporte JSON
    with open(root_path / 'AUDIT_REPORT.json', 'w') as f:
        json.dump(report, f, indent=2, default=str)

    # Guardar plan JSON
    with open(root_path / 'PHASE_PLAN.json', 'w') as f:
        json.dump(plan, f, indent=2)

    print("\n✅ Reportes guardados:")
    print("  - AUDIT_REPORT.json")
    print("  - PHASE_PLAN.json")
