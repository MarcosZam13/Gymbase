// ClassCancelledEmail.tsx — Template email para notificar cancelación de clase reservada

import {
  Html, Head, Body, Container, Section, Text, Hr,
} from "@react-email/components";

interface ClassCancelledEmailProps {
  memberName: string;
  className: string;
  classDate: string;  // Fecha/hora formateada para mostrar al miembro
}

export function ClassCancelledEmail({
  memberName,
  className,
  classDate,
}: ClassCancelledEmailProps): React.ReactNode {
  return (
    <Html lang="es">
      <Head />
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          {/* Header con acento de marca */}
          <Section style={headerStyle}>
            <Text style={logoStyle}>GymBase</Text>
          </Section>

          <Section style={contentStyle}>
            <Text style={titleStyle}>Clase cancelada</Text>

            <Text style={textStyle}>
              Hola {memberName},
            </Text>

            <Text style={textStyle}>
              Te informamos que la clase <strong style={{ color: "var(--gym-accent)" }}>{className}</strong> programada
              para el <strong style={{ color: "#ffffff" }}>{classDate}</strong> ha sido cancelada.
            </Text>

            <Text style={textStyle}>
              Lamentamos los inconvenientes. Te invitamos a reservar otra clase disponible en el portal.
            </Text>

            <Hr style={hrStyle} />

            <Text style={footerTextStyle}>
              Este mensaje fue enviado automáticamente. Por favor no respondas a este correo.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const bodyStyle = {
  backgroundColor: "var(--background)",
  fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  margin: "0",
  padding: "20px 0",
};

const containerStyle = {
  maxWidth: "480px",
  margin: "0 auto",
  backgroundColor: "var(--card)",
  borderRadius: "16px",
  overflow: "hidden" as const,
  border: "1px solid var(--border)",
};

const headerStyle = {
  backgroundColor: "var(--sidebar)",
  padding: "24px 32px",
  borderBottom: "2px solid #FF5E14",
};

const logoStyle = {
  fontSize: "20px",
  fontWeight: "700",
  color: "var(--gym-accent)",
  margin: "0",
  letterSpacing: "0.04em",
};

const contentStyle = {
  padding: "32px",
};

const titleStyle = {
  fontSize: "22px",
  fontWeight: "700",
  color: "#F5F5F5",
  margin: "0 0 20px 0",
};

const textStyle = {
  fontSize: "14px",
  lineHeight: "1.6",
  color: "#9A9A9A",
  margin: "0 0 16px 0",
};

const hrStyle = {
  borderColor: "#1E1E1E",
  margin: "24px 0",
};

const footerTextStyle = {
  fontSize: "11px",
  color: "#444444",
  margin: "0",
};
