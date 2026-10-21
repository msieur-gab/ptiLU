// Make an empty file. A type becomes the extension; a name that has one keeps it; otherwise .md
// (Markdown, until the file type is a value of its own).
module.exports = {
  run(ctx) {
    let { name } = ctx.slots;
    const { file_type, location } = ctx.slots;
    let note = "";
    if (!/\.[A-Za-z0-9]{1,5}$/.test(name)) {
      const ext = file_type && ctx.find("ext", file_type);
      if (ext) name += "." + ext.out;
      else { name += ".md"; note = " " + ctx.say("default_type"); }
    }
    const at = ctx.files.where(location);
    ctx.exec("mkdir -p " + ctx.files.quote(at.path) + " && touch " + ctx.files.quote(at.path + "/" + name));
    return ctx.say("done", { file: "“" + name + "”", where: at.label }) + note;
  },
};
