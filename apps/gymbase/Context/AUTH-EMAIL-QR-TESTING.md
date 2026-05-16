# Auth Email Flows, Branding OAuth + QR Testing on Deploy

## Parte 1 — Resend como SMTP de Supabase

Supabase en producción necesita un servidor SMTP real para enviar emails (confirmación de cuenta, reset de contraseña, invitaciones). La opción más simple es **Resend**.

### Setup Resend

1. Crear cuenta en [resend.com](https://resend.com)
2. Crear API Key (menú **API Keys** → **Create API Key** → permiso "Full Access")
3. Verificar el dominio del gym en Resend (Domains → Add Domain)
   - Agregar los registros DNS que pide Resend (SPF, DKIM, DMARC) en el proveedor de dominios
   - Sin verificación de dominio, los emails van al spam o no llegan

### Configurar SMTP en Supabase

Dashboard → **Authentication** → **Email** (o **SMTP Settings**):

| Campo | Valor |
|---|---|
| **SMTP Host** | `smtp.resend.com` |
| **Port** | `465` |
| **Username** | `resend` |
| **Password** | `[tu API Key de Resend]` |
| **Sender name** | `Iron Gym` (o el nombre del gym) |
| **Sender email** | `noreply@tudominio.com` (debe ser el dominio verificado en Resend) |

> Guardar y hacer un test de "Send test email" desde el dashboard para confirmar.

### Templates de email (Supabase Dashboard → Auth → Email Templates)

Personalizar los templates para que lleguen con el nombre del gym:

- **Confirm signup**: asunto `Confirma tu cuenta en Iron Gym`, cuerpo con `{{ .ConfirmationURL }}`
- **Reset Password**: asunto `Restablece tu contraseña`, cuerpo con `{{ .ConfirmationURL }}`
- **Invite User**: asunto `Te invitamos a Iron Gym`, cuerpo con `{{ .ConfirmationURL }}`

La URL de confirmación debe apuntar al auth callback correcto:
```
Site URL (Dashboard → Auth → URL Configuration): https://iron-gym.gymbase.app
Redirect URLs (lista blanca): https://iron-gym.gymbase.app/auth/callback
```

---

## Parte 2 — Confirmación de correo en el registro

### Cómo funciona

1. Usuario llena el formulario de registro (email + contraseña) en `/login` o `/register`
2. Se llama `supabase.auth.signUp({ email, password, options: { data: { org_id, full_name } } })`
3. Supabase envía un email de confirmación vía Resend con link → `https://[dominio]/auth/callback?token_hash=xxx&type=email`
4. El usuario hace clic → `route.ts` verifica el OTP → redirige a `/portal/dashboard`

### Configuración en Supabase

Dashboard → **Authentication** → **Providers** → **Email**:
- **Enable Email provider**: ON
- **Confirm email**: ON (activar esto es lo que dispara el flujo de confirmación)
- **Double confirm email changes**: ON (buena práctica para cambios de email)

### Fix que ya está aplicado en el código

El archivo `src/app/auth/callback/route.ts` distingue el tipo de token:

```typescript
// type=email → cuenta confirmada → ir al portal
// type=invite / type=recovery → necesita contraseña → ir a /reset-password
const destination = type === "email" ? next : "/reset-password";
return NextResponse.redirect(`${origin}${destination}`);
```

Sin esta distinción, todos los emails (confirmación, reset, invitación) aterrizaban en `/reset-password`, que es incorrecto para confirmaciones.

---

## Parte 3 — Reset de contraseña (Olvidé mi contraseña)

### Flujo completo

```
/forgot-password
  ↓ usuario escribe su email
  ↓ requestPasswordReset(email) → supabase.auth.resetPasswordForEmail(email, { redirectTo })
  ↓ Resend envía email con link
  ↓ /auth/callback?token_hash=xxx&type=recovery
  ↓ verifyOtp → sesión temporal
  ↓ redirect a /reset-password
  ↓ usuario escribe nueva contraseña → supabase.auth.updateUser({ password })
  ↓ redirect a /portal/dashboard
```

### La acción `requestPasswordReset`

Vive en `src/actions/auth.actions.ts`. Debe incluir el `redirectTo` con la URL completa del callback:

```typescript
await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/portal/dashboard`,
});
```

Si `NEXT_PUBLIC_SITE_URL` no está definida en `.env.local`, el link del email apuntará a localhost en producción.

### Variable de entorno requerida

```bash
# .env.local (y en Vercel → Environment Variables)
NEXT_PUBLIC_SITE_URL=https://iron-gym.gymbase.app
```

> **Importante**: sin esta variable el link del email de reset apunta a localhost.

---

## Parte 4 — Pruebas QR en deploy

### Contexto del sistema QR

- El admin genera un QR por clase desde el panel de clases (Calendar)
- El QR contiene una URL: `https://[dominio]/portal/scan?class_id=[uuid]&token=[token]`
- El miembro escanea → se registra asistencia en `gym_class_attendance`

### Checklist post-deploy

#### 1. Verificar generación del QR

```
1. Login como admin → Calendar → seleccionar una clase → "Generar QR"
2. El QR debe aparecer en pantalla (componente QRCode)
3. Copiar la URL del QR y abrirla en el navegador — debe cargar /portal/scan correctamente
```

#### 2. Verificar escaneo desde mobile

```
1. Abrir la URL del QR en el celular (o usar la cámara para escanear)
2. Si el miembro no está logueado → debe redirigir a /login → volver a /portal/scan después del login
3. Si ya está logueado → registra asistencia inmediatamente
4. El miembro debe ver "Asistencia registrada" (toast o UI de confirmación)
```

#### 3. Verificar que la asistencia queda registrada

```
1. Admin → Calendar → ver la clase escaneada
2. Debe aparecer el miembro en la lista de asistentes
3. En el portal del miembro → sección Asistencia → debe reflejar el check
```

#### 4. Casos borde a probar

| Caso | Comportamiento esperado |
|---|---|
| Escanear el mismo QR dos veces | Toast "Ya registraste asistencia" (no duplicar fila) |
| QR expirado (clase pasada) | Mensaje de error con fecha de la clase |
| QR de otra org | RLS bloquea → error de no autorizado |
| Escanear sin internet | Error de red, no crash |

#### 5. Verificar URL base en producción

La URL del QR debe usar el dominio de producción, no localhost. Si el admin generó el QR en local, la URL tendrá `localhost:3000` — eso es normal para desarrollo pero hay que regenerarlo en producción.

Confirmar que `NEXT_PUBLIC_SITE_URL` o la base URL en el generador de QR usa la URL correcta:

```typescript
// Buscar en el código dónde se construye la URL del QR
// Debe ser algo como:
const qrUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/portal/scan?class_id=${classId}&token=${token}`;
```

---

---

## Parte 5 — Branding de Google OAuth (consent screen)

### El problema

Cuando un usuario hace clic en "Iniciar sesión con Google" ve dos cosas feas:
1. **"Ir a vwkxrjnxfjfzobzzoagj.supabase.co"** — el ID crudo del proyecto de Supabase
2. **"Vas a iniciar sesión en vwkxrjnxfjfzobzzoagj.supabase.co"** — mismo dominio

Esto pasa porque el flujo OAuth de Supabase redirige por `https://[proyecto].supabase.co/auth/v1/callback`, que es el dominio que Google muestra. No es configurable desde Supabase sin un dominio personalizado.

Hay **dos capas** a mejorar: una gratis ya, y una de pago.

---

### Capa 1 — Google Cloud Console: App name + logo (gratis, hoy)

Esto cambia el nombre y logo que aparecen en el consent screen de Google. No cambia el dominio, pero hace que el flujo se vea como "GymBase" en lugar de un proyecto anónimo.

**Ir a:** [console.cloud.google.com](https://console.cloud.google.com) → el proyecto donde está configurado el OAuth de Supabase → **APIs & Services** → **OAuth consent screen**

Configurar:

| Campo | Valor |
|---|---|
| **App name** | `GymBase` |
| **User support email** | correo de contacto de GymBase |
| **App logo** | logo de GymBase (120×120 px mínimo, PNG) |
| **App domain → Application home page** | `https://gymbase.app` |
| **App domain → Privacy policy** | `https://gymbase.app/privacy` (o crear esta página) |
| **App domain → Terms of service** | `https://gymbase.app/terms` |
| **Authorized domains** | `gymbase.app` |

> El logo tarda hasta 24h en aparecer en la pantalla de consent de Google.

**Publicar la app**: si el consent screen está en modo "Testing", solo funcionan los usuarios en la lista de test. Para producción:
- OAuth consent screen → **Publishing status** → **Publish App** → confirmar

---

### Capa 2 — Supabase Custom Domain: ocultar `.supabase.co` (plan Pro, ~$25/mes)

Sin este paso, Google siempre mostrará el dominio `[proyecto].supabase.co` porque es ahí donde vive el endpoint de OAuth de Supabase.

Con un **Custom Domain** de Supabase, el endpoint de auth pasa de:
```
https://vwkxrjnxfjfzobzzoagj.supabase.co/auth/v1/callback
```
a:
```
https://auth.gymbase.app/auth/v1/callback
```

Y Google mostraría **"Ir a auth.gymbase.app"** en el consent screen.

**Cómo configurarlo cuando esté en Pro:**

1. Supabase Dashboard → **Project Settings** → **Custom Domains**
2. Agregar dominio: `auth.gymbase.app`
3. Copiar los registros DNS que Supabase proporciona (CNAME) y agregarlos en el proveedor de dominios
4. Esperar propagación DNS (~1-24h)
5. Verificar en Supabase → "Activate"

Luego actualizar en Google Cloud Console → **Credentials** → el cliente OAuth → **Authorized redirect URIs**:
```
# Antes:
https://vwkxrjnxfjfzobzzoagj.supabase.co/auth/v1/callback

# Después:
https://auth.gymbase.app/auth/v1/callback
```

Y actualizar en Supabase Dashboard → **Authentication** → **URL Configuration**:
```
Site URL: https://gymbase.app   (o el dominio del gym actual)
```

---

### Capa 3 — Emails de Resend con dominio propio (gratis con plan gratuito)

Los emails de confirmación y reset deben salir desde un dominio propio, no desde `@resend.dev`:

- **Antes**: `noreply@resend.dev`
- **Después**: `noreply@gymbase.app` o `hola@gymbase.app`

Esto requiere verificar el dominio `gymbase.app` en Resend (ver Parte 1 de este doc).

Una vez verificado, cambiar el **Sender email** en el SMTP de Supabase a `noreply@gymbase.app`.

---

### Resumen: qué se puede hacer ahora vs. después

| Mejora | Cuándo | Costo |
|---|---|---|
| Nombre "GymBase" en consent screen de Google | Ahora | Gratis |
| Logo GymBase en consent screen | Ahora | Gratis |
| Emails desde `@gymbase.app` | Cuando tengas el dominio verificado en Resend | Gratis |
| Dominio `auth.gymbase.app` en lugar de `.supabase.co` | Cuando pases a Supabase Pro | $25/mes |
| "Publicar" app de Google (sin modo testing) | Antes del launch | Gratis (requiere verificación de Google) |

---

## Variables de entorno checklist

Antes del deploy, verificar que estas variables están configuradas en Vercel:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://[proyecto].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon key]
SUPABASE_SERVICE_ROLE_KEY=[service role key]
NEXT_PUBLIC_SITE_URL=https://iron-gym.gymbase.app    # para email callbacks
GYMBASE_ORG_ID=[uuid del gym]                         # para multi-tenancy
```
