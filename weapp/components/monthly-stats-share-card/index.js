const {
  getCanvasScale,
  loadCanvasImage,
  saveCanvasToAlbum
} = require('../../utils/share-card-canvas');

const CARD_WIDTH = 320;
const CARD_HEIGHT = 500;

function setFont(ctx, size, weight = '400') {
  ctx.font = `${weight} ${size}px "Songti SC", STSong, serif`;
  ctx.textBaseline = 'alphabetic';
}

function drawImageCover(ctx, loaded, x, y, width, height) {
  if (!loaded || !loaded.image) return false;
  const ratio = Math.max(width / loaded.width, height / loaded.height);
  const sourceWidth = width / ratio;
  const sourceHeight = height / ratio;
  const sourceX = (loaded.width - sourceWidth) / 2;
  const sourceY = (loaded.height - sourceHeight) / 2;
  ctx.drawImage(loaded.image, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height);
  return true;
}

Component({
  properties: {
    show: { type: Boolean, value: false },
    cardData: { type: Object, value: {} }
  },

  data: {
    saving: false,
    rendering: false,
    previewScale: 1,
    previewPercent: 100,
    previewWidth: CARD_WIDTH,
    previewHeight: CARD_HEIGHT,
    previewViewportHeight: CARD_HEIGHT
  },

  observers: {
    'show, cardData': function(show) {
      if (!show) return;
      this.setData({
        previewScale: 1,
        previewPercent: 100,
        previewWidth: CARD_WIDTH,
        previewHeight: CARD_HEIGHT,
        previewViewportHeight: CARD_HEIGHT
      });
      setTimeout(() => this.drawCard(), 80);
    }
  },

  methods: {
    handleClose() {
      if (this.data.saving) return;
      this.triggerEvent('close');
    },

    stopPropagation() {},

    setPreviewScale(event) {
      const requested = Number(event.currentTarget.dataset.scale);
      const previewScale = Math.max(0.75, Math.min(1.5, requested || 1));
      this.setData({
        previewScale,
        previewPercent: Math.round(previewScale * 100),
        previewWidth: Math.round(CARD_WIDTH * previewScale),
        previewHeight: Math.round(CARD_HEIGHT * previewScale),
        previewViewportHeight: Math.min(560, Math.round(CARD_HEIGHT * previewScale))
      });
    },

    zoomOut() {
      this.setPreviewScale({ currentTarget: { dataset: { scale: this.data.previewScale - 0.25 } } });
    },

    zoomIn() {
      this.setPreviewScale({ currentTarget: { dataset: { scale: this.data.previewScale + 0.25 } } });
    },

    resetZoom() {
      this.setPreviewScale({ currentTarget: { dataset: { scale: 1 } } });
    },

    formatNumber(value) {
      return String(Math.max(0, Number(value) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    },

    getCanvas() {
      return new Promise((resolve) => {
        wx.createSelectorQuery()
          .in(this)
          .select('#monthlyStatsCanvas')
          .fields({ node: true })
          .exec((result) => resolve(result && result[0] ? result[0].node : null));
      });
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
      const loadedAvatar = data.profileAvatar
        ? await loadCanvasImage(canvas, data.profileAvatar)
        : null;
      if (renderId !== this.renderId) return null;

      const scale = getCanvasScale(CARD_WIDTH, CARD_HEIGHT);
      canvas.width = Math.round(CARD_WIDTH * scale);
      canvas.height = Math.round(CARD_HEIGHT * scale);
      const ctx = canvas.getContext('2d');
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      ctx.clearRect(0, 0, CARD_WIDTH, CARD_HEIGHT);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

      ctx.fillStyle = '#2D5A27';
      setFont(ctx, 13);
      ctx.fillText(`${data.year || ''}年`, 24, 38);
      setFont(ctx, 42, '700');
      ctx.fillText(String(data.month || 0), 24, 82);
      setFont(ctx, 17);
      ctx.fillText('月', 70, 80);
      setFont(ctx, 13);
      ctx.fillText('已累计练习', 206, 38);
      setFont(ctx, 42, '700');
      ctx.fillText(String(data.totalHours || 0), 206, 82);
      setFont(ctx, 17);
      ctx.fillText('小时', 255, 80);

      const days = Array.isArray(data.calendarDays) ? data.calendarDays : [];
      days.forEach((item, index) => {
        if (item.empty) return;
        const col = index % 7;
        const row = Math.floor(index / 7);
        const cx = 52 + col * 36;
        const cy = 136 + row * 36;
        ctx.beginPath();
        ctx.arc(cx, cy, 16, 0, Math.PI * 2);
        ctx.fillStyle = item.practiced ? '#2D5A27' : '#F5F2EC';
        ctx.fill();
      });

      const statsY = 378;
      ctx.fillStyle = '#2D5A27';
      setFont(ctx, 12);
      ctx.fillText('相当于', 24, statsY);
      setFont(ctx, 25, '700');
      ctx.fillText(this.formatNumber(data.breathCount), 24, statsY + 32);
      setFont(ctx, 12);
      ctx.fillText('次深呼吸', 24, statsY + 52);
      ctx.fillText('像一棵树进行了', 184, statsY);
      ctx.fillStyle = '#F97316';
      setFont(ctx, 25, '700');
      ctx.fillText(this.formatNumber(data.photosynthesisCount), 184, statsY + 32);
      ctx.fillStyle = '#2D5A27';
      setFont(ctx, 12);
      ctx.fillText('次光合作用', 184, statsY + 52);

      ctx.save();
      ctx.beginPath();
      ctx.arc(40, 462, 16, 0, Math.PI * 2);
      ctx.clip();
      ctx.fillStyle = '#DCE8D8';
      ctx.fillRect(24, 446, 32, 32);
      drawImageCover(ctx, loadedAvatar, 24, 446, 32, 32);
      ctx.restore();
      if (!loadedAvatar) {
        ctx.fillStyle = '#2D5A27';
        ctx.textAlign = 'center';
        setFont(ctx, 13, '700');
        ctx.fillText('人', 40, 467);
        ctx.textAlign = 'left';
      }
      ctx.fillStyle = '#2D5A27';
      setFont(ctx, 12, '600');
      ctx.fillText(data.profileName || '阿斯汤加习练者', 64, 454);
      ctx.fillStyle = '#8A8F8B';
      setFont(ctx, 10);
      ctx.save();
      ctx.beginPath();
      ctx.rect(64, 458, 170, 18);
      ctx.clip();
      ctx.fillText(data.profileSignature || '练习、练习，一切随之而来。', 64, 472);
      ctx.restore();
      ctx.fillText('熬汤日记', 254, 472);

      this.setData({ rendering: false });
      return { canvas, scale };
    },

    async saveImage() {
      if (this.data.saving || this.data.rendering) return;
      this.setData({ saving: true });
      try {
        const target = await this.drawCard();
        if (!target) throw new Error('画布未准备好');
        await saveCanvasToAlbum(this, target.canvas, CARD_WIDTH, CARD_HEIGHT, target.scale);
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
