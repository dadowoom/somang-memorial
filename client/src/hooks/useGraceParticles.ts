import { useEffect } from "react";

export function useGraceParticles() {
  useEffect(() => {
    let scrollTimeout: NodeJS.Timeout;

    const createParticles = () => {
      // 5개의 입자 생성
      for (let i = 0; i < 5; i++) {
        const particle = document.createElement("div");
        particle.className = `grace-particle grace-particle-${i + 1}`;
        
        // 랜덤 위치에서 시작
        const randomX = Math.random() * window.innerWidth;
        const randomY = window.scrollY + Math.random() * window.innerHeight;
        
        particle.style.left = randomX + "px";
        particle.style.top = randomY + "px";
        
        // 따뜻한 톤의 별 이모지 또는 심볼
        const symbols = ["✦", "✧", "•", "◆", "★"];
        particle.textContent = symbols[Math.floor(Math.random() * symbols.length)];
        
        // 색상 설정 (골드 톤)
        const isDarkMode = document.documentElement.classList.contains("royal-dark");
        particle.style.color = isDarkMode 
          ? "rgba(201, 168, 76, 0.7)" 
          : "rgba(201, 168, 76, 0.5)";
        
        document.body.appendChild(particle);
        
        // 애니메이션 완료 후 제거
        setTimeout(() => {
          particle.remove();
        }, 4000);
      }
    };

    const handleScroll = () => {
      clearTimeout(scrollTimeout);
      
      // 스크롤 중일 때만 입자 생성 (성능 최적화)
      scrollTimeout = setTimeout(() => {
        createParticles();
      }, 300);
    };

    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, []);
}
