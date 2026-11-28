package assets

import _ "embed"

//go:embed aglaunch_hook.js
var HookJS []byte

//go:embed renderer_i18n.js
var I18nRendererJS []byte

//go:embed renderer_skin.js
var SkinRendererJS []byte

//go:embed renderer_theme.js
var ThemeRendererJS []byte

//go:embed renderer_settings.js
var SettingsRendererJS []byte

//go:embed renderer_tweaks.js
var TweaksRendererJS []byte

//go:embed dict_zh_cn.json
var DefaultDictJSON []byte
