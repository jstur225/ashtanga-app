const {
  getCanvasScale,
  loadCanvasImage,
  saveCanvasToAlbum
} = require('../../utils/share-card-canvas');

const CARD_WIDTH = 320;
const PHOTO_WIDTH = 280;
const MIN_CARD_HEIGHT = 390;

function setFont(ctx, size, weight = '400') {
  ctx.font = `${weight} ${size}px "Songti SC", STSong, serif`;
  ctx.textBaseline = 'alphabetic';
}

function roundRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function wrapText(ctx, text, maxWidth) {
  const source = String(text || '今日练习完成').replace(/\r\n/g, '\n');
  const lines = [];
  let line = '';
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (char === '\n') {
      lines.push(line || ' ');
      line = '';
      continue;
    }
    const candidate = line + char;
    if (line && ctx.measureText(candidate).width > maxWidth) {
      lines.push(line);
      line = char;
    } else {
      line = candidate;
    }
  }
  if (line || !lines.length) lines.push(line || '今日练习完成');
  return lines;
}

function drawImageContain(ctx, loaded, x, y, width, height) {
  if (!loaded || !loaded.image) return false;
  const ratio = Math.min(width / loaded.width, height / loaded.height);
  const drawWidth = loaded.width * ratio;
  const drawHeight = loaded.height * ratio;
  ctx.drawImage(
    loaded.image,
    x + (width - drawWidth) / 2,
    y + (height - drawHeight) / 2,
    drawWidth,
    drawHeight
  );
  return true;
}

Component({
  properties: {
    show: { type: Boolean, value: false },
    cardData: { type: Object, value: {} }
  },

  data: {
    saving: false,
    rendering: false
  },

  methods: {
    handleClose() {
      if (this.data.saving) return;
      this.triggerEvent('close');
    },

    stopPropagation() {},

    preventBackgroundScroll() {},

    getCanvas() {
      return new Promise((resolve) => {
        wx.createSelectorQuery()
          .in(this)
          .select('#recordShareCanvas')
          .fields({ node: true })
          .exec((result) => resolve(result && result[0] ? result[0].node : null));
      });
    },

    drawStatsItem(ctx, value, unit, label, centerX, y) {
      ctx.fillStyle = '#2A4B3C';
      ctx.textAlign = 'center';
      setFont(ctx, 24, '700');
      ctx.fillText(String(value || 0), centerX - (unit.length > 1 ? 8 : 5), y);
      setFont(ctx, 11);
      ctx.fillText(unit, centerX + 24, y);
      ctx.fillStyle = '#8A8F8B';
      setFont(ctx, 10);
      ctx.fillText(label, centerX, y + 23);
      ctx.textAlign = 'left';
    },

    async drawCard() {
      const renderId = (this.renderId || 0) + 1;
      this.renderId = renderId;
      this.setData({ rendering: true });
      const canvas = await this.getCanvas();
      if (!canvas || renderId !== this.renderId) {
        this.setData({ rendering: false });
        return null;
      }

      const data = this.data.cardData || {};
      const measureCtx = canvas.getContext('2d');
      setFont(measureCtx, 14);
      const noteLines = wrapText(measureCtx, data.notes || '今日练习完成', 280);
      const photoSources = Array.isArray(data.photos) ? data.photos.filter(Boolean) : [];
      const loadedPhotos = await Promise.all(photoSources.map((src) => loadCanvasImage(canvas, src)));
      const loadedAvatar = data.profileAvatar
        ? await loadCanvasImage(canvas, data.profileAvatar)
        : null;
      if (renderId !== this.renderId) return null;

      const headerBottom = data.breakthrough ? 146 : 100;
      const notesY = headerBottom + 32;
      const notesHeight = Math.max(23, noteLines.length * 23);
      let cursorY = notesY + notesHeight;
      const photoLayouts = loadedPhotos.map((loaded) => {
        const naturalHeight = loaded
          ? PHOTO_WIDTH * loaded.height / loaded.width
          : 160;
        const height = Math.max(80, Math.min(520, naturalHeight));
        const layout = { loaded, y: cursorY + 18, height };
        cursorY = layout.y + height + 12;
        return layout;
      });
      const dividerY = Math.max(cursorY + (photoLayouts.length ? 12 : 24), notesY + notesHeight + 24);
      const statsTop = dividerY + 48;
      const profileDividerY = statsTop + 62;
      const cardHeight = Math.max(MIN_CARD_HEIGHT, profileDividerY + 106);
      if (renderId !== this.renderId) return null;

      const scale = getCanvasScale(CARD_WIDTH, cardHeight);
      canvas.width = Math.round(CARD_WIDTH * scale);
      canvas.height = Math.round(cardHeight * scale);
      const ctx = canvas.getContext('2d');
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      ctx.clearRect(0, 0, CARD_WIDTH, cardHeight);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, CARD_WIDTH, cardHeight);

      ctx.fillStyle = '#8A8F8B';
      setFont(ctx, 12);
      ctx.fillText(`${data.formattedDate || ''} / ${data.type || ''}`, 20, 30);
      ctx.fillStyle = '#2A4B3C';
      setFont(ctx, 40, '700');
      ctx.fillText(String(data.durationMinutes || 0), 20, 78);
      setFont(ctx, 18);
      ctx.fillText('分钟', 88, 76);

      if (data.breakthrough) {
        const label = `✦ ${String(data.breakthrough)}`;
        ctx.fillStyle = '#FFF7ED';
        roundRect(ctx, 20, 96, 280, 34, 17);
        ctx.fill();
        ctx.strokeStyle = 'rgba(230,126,34,.2)';
        ctx.stroke();
        ctx.save();
        roundRect(ctx, 20, 96, 280, 34, 17);
        ctx.clip();
        ctx.fillStyle = '#E67E22';
        setFont(ctx, 14, '700');
        ctx.fillText(label, 34, 118);
        ctx.restore();
      }

      ctx.strokeStyle = '#E5E5E5';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(20, headerBottom);
      ctx.lineTo(300, headerBottom);
      ctx.stroke();

      ctx.fillStyle = '#2A4B3C';
      setFont(ctx, 14);
      noteLines.forEach((line, index) => ctx.fillText(line, 20, notesY + index * 23));

      photoLayouts.forEach((layout) => {
        ctx.save();
        roundRect(ctx, 20, layout.y, PHOTO_WIDTH, layout.height, 8);
        ctx.clip();
        ctx.fillStyle = '#F5F2EC';
        ctx.fillRect(20, layout.y, PHOTO_WIDTH, layout.height);
        const drawn = drawImageContain(ctx, layout.loaded, 20, layout.y, PHOTO_WIDTH, layout.height);
        ctx.restore();
        if (!drawn) {
          ctx.fillStyle = '#8A8F8B';
          ctx.textAlign = 'center';
          setFont(ctx, 12);
          ctx.fillText('照片加载失败', 160, layout.y + layout.height / 2);
          ctx.textAlign = 'left';
        }
      });

      ctx.strokeStyle = '#E5E5E5';
      ctx.beginPath();
      ctx.moveTo(20, dividerY);
      ctx.lineTo(300, dividerY);
      ctx.moveTo(20, profileDividerY);
      ctx.lineTo(300, profileDividerY);
      ctx.stroke();

      this.drawStatsItem(ctx, data.thisMonthDays, '天', '本月练习', 66, statsTop + 12);
      this.drawStatsItem(ctx, data.totalPracticeCount, '次', '累计练习', 160, statsTop + 12);
      this.drawStatsItem(ctx, data.totalHours, '小时', '累计时长', 254, statsTop + 12);

      const avatarX = 36;
      const avatarY = profileDividerY + 52;
      ctx.save();
      ctx.beginPath();
      ctx.arc(avatarX, avatarY, 15, 0, Math.PI * 2);
      ctx.clip();
      ctx.fillStyle = '#2D5A27';
      ctx.fillRect(21, avatarY - 15, 30, 30);
      if (loadedAvatar) drawImageContain(ctx, loadedAvatar, 21, avatarY - 15, 30, 30);
      ctx.restore();
      if (!loadedAvatar) {
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        setFont(ctx, 13, '700');
        ctx.fillText('人', avatarX, avatarY + 5);
        ctx.textAlign = 'left';
      }
      ctx.fillStyle = '#E67E22';
      setFont(ctx, 13);
      ctx.fillText(data.profileName || '阿斯汤加习练者', 60, avatarY - 6);
      ctx.fillStyle = '#8A8F8B';
      setFont(ctx, 10);
      ctx.save();
      ctx.beginPath();
      ctx.rect(60, avatarY, 170, 18);
      ctx.clip();
      ctx.fillText(data.profileSignature || '练习、练习，一切随之而来。', 60, avatarY + 12);
      ctx.restore();
      ctx.fillText('熬汤日记', 250, avatarY + 12);

      this.setData({ rendering: false });
      return { canvas, scale, cardHeight };
    },

    async saveImage() {
      if (this.data.saving) return;
      this.setData({ saving: true });
      try {
        const target = await this.drawCard();
        if (!target) throw new Error('画布未准备好');
        await saveCanvasToAlbum(this, target.canvas, CARD_WIDTH, target.cardHeight, target.scale);
        wx.showToast({ title: '图片已保存', icon: 'success' });
        this.triggerEvent('close');
      } catch (error) {
        wx.showToast({ title: '保存失败，请检查相册权限', icon: 'none' });
      } finally {
        this.setData({ saving: false });
      }
    }
  }
});
