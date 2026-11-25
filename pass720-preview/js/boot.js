/* 合格720 / Pass 720 — 起動。言語と見た目を決め、その言語のデータだけ読み込む。
   言語：?lang=ja|en → localStorage p720.lang → 端末の言語（ja 以外は en）
   見た目：?ui=a|b|c → localStorage p720.ui（a＝参考書・b＝黒板・c＝試験会場）
   EXAMS に その言語で用意できている試験を書く。data/<lang>/ に q- h- o- t- の4本がそろったら足す。 */
(function () {
  var V = '3';
  var EXAMS = {
    ja: ['ccao', 'ccdv', 'ccarf', 'ccarp', 'ccdvp'],
    en: ['ccao','ccdv','ccarf','ccarp','ccdvp'],
  };
  // 12/7 からのガイド v1.1 がある試験。data/<lang>/n-<試験>.js（足した問題）と t-<試験>-11.js（テキスト）、data/map-11.js を読む
  var V11 = ['ccao', 'ccdv', 'ccarp'];
  var get = function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } };
  var set = function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} };
  var q = new URLSearchParams(location.search);
  var u = q.get('ui'); if (u) set('p720.ui', u);
  u = get('p720.ui'); if (u === 'b' || u === 'c') document.documentElement.dataset.ui = u;
  var l = q.get('lang'); if (l === 'ja' || l === 'en') set('p720.lang', l);
  l = get('p720.lang');
  if (l !== 'ja' && l !== 'en') l = (navigator.language || 'ja').toLowerCase().indexOf('ja') === 0 ? 'ja' : 'en';
  document.documentElement.lang = l;
  window.P720 = {
    lang: l, v: V, exams: EXAMS[l], all: EXAMS.ja,
    setLang: function (x) { set('p720.lang', x); location.replace(location.pathname + '?lang=' + x); },
    load: function () {
      var b = 'data/' + l + '/', v = '?v=' + V, s = function (f) { return '<script src="' + f + v + '"><\/script>'; };
      var h = s(b + 'blueprint.js') + s(b + 'blueprint-11.js') + s('data/map-11.js');
      EXAMS[l].forEach(function (e) { ['q-', 'h-', 'o-', 't-'].forEach(function (p) { h += s(b + p + e + '.js'); }); });
      V11.forEach(function (e) { h += s(b + 'n-' + e + '.js') + s(b + 't-' + e + '-11.js'); });
      if (l === 'en') h += '<script src="js/i18n-en.js' + v + '"><\/script>';
      h += '<script src="js/app.js' + v + '"><\/script>';
      document.write(h);
    },
  };
})();
