package assets

import _ "embed"

//go:embed agzh_hook.js
var HookJS []byte

//go:embed renderer_i18n.js
var RendererJS []byte

//go:embed dict_zh_cn.json
var DefaultDictJSON []byte
