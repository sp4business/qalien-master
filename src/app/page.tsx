import AuthWrapper from "../components/AuthWrapper";
import BusinessCenter from "../components/BusinessCenter";

export default function Home() {
  return (
    <AuthWrapper>
      <BusinessCenter />
    </AuthWrapper>
  );
}
