# 🏠 House Clipper

**House Clipper** é um aplicativo moderno para você **clipar vídeos do YouTube com máxima precisão visual sem ter que baixar o vídeo todo**, além de baixar vídeos completos em alta resolução tanto do **YouTube** quanto do **Twitter (X)**.

- 🌐 **Versão Web (GitHub Pages)**: [https://ziaker.github.io/house-clipper/](https://ziaker.github.io/house-clipper/)
- 💻 **Versão Desktop**: `HouseClipper.exe` para Windows
- 📦 **Versão**: `v1.1.0`
- 🎨 **Tema Visual**: Amarelo Queimado (*Warm Burnt Amber*) & Modo Noturno Escuro (*Deep Night Amber*)
- 🏷️ **Ícone**: Casa estilizada em amarelo queimado com a letra **C** azul cobalto no centro.

---

## ✨ Recursos Principais

1. **🌐 Funciona no Navegador (GitHub Pages) e no Desktop**:
   - Acesse diretamente pelo navegador sem instalar nada: [https://ziaker.github.io/house-clipper/](https://ziaker.github.io/house-clipper/)
   - Ou abra o **`HouseClipper.exe`** no seu PC para processamento nativo com FFmpeg sem limitações!

2. **✂️ Régua Visual de Minutos (Timeline Ruler)**:
   - Divisões clicáveis de minuto a minuto (`00:00`, `01:00`, `02:00`, `03:00`...).
   - Pule instantaneamente para qualquer minuto do vídeo para localizar o momento desejado com um clique.
   - Pulos rápidos com botões: `⏪ -1 min`, `⏪ -10s`, `+10s ⏩`, `+1 min ⏩`.

3. **⏱️ Seletores Diretos de Minutos e Segundos**:
   - Defina início e fim digitando minutos e segundos diretamente (ex: `Min 03` e `Sec 15` até `Min 04` e `Sec 40`).
   - Botão **"Pegar Atual"** que captura no milissegundo a posição exata onde o player está pausado ou tocando.
   - Ajuste fino com botões de `-1s`, `-0.2s`, `+0.2s` e `+1s`.

4. **🎞️ Faixa Visual de Corte (Shaded Range) & Playhead**:
   - Destaque em amarelo queimado translúcido na barra da timeline mostrando a extensão exata do clipe em relação à duração total.
   - Indicador de reprodução em tempo real (*Playhead* verde) sincronizado com o player.

5. **🌙 Alternador de Modo Noturno Amarelo Escuro**:
   - Alterne instantaneamente entre o tema **Âmbar Dourado** e o **Noturno Escuro** com um amarelo mais fechado e fundo preto profundo para descanso visual.

6. **🍪 Suporte a Cookies (`cookies.json`)**:
   - Importe seus cookies do YouTube ou X em formato JSON para acessar vídeos restritos por idade ou contornar captchas.

7. **⚡ Download Parcial (Zero Desperdício de Banda e Disco)**:
   - Baixa exclusivamente os segundos selecionados direto dos servidores do YouTube via HTTP ranges com FFmpeg, gerando o clipe em instantes.

---

## 🚀 Como Executar

### 1. No Navegador (Sem Instalação)
Basta abrir o link:
👉 [https://ziaker.github.io/house-clipper/](https://ziaker.github.io/house-clipper/)

### 2. No Computador (Desktop Nativo)
Dê dois cliques no arquivo:
```
HouseClipper.exe
```
*(Ou execute `iniciar_house_clipper.bat` / `python main.py`)*
