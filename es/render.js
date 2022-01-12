export default {
  psd2png(source, path, name) {
    let helperSequenceComp = app.project.items.addComp('tempConverterComp', source.width, source.height, 1, 1, 1);
    helperSequenceComp.layers.add(source);
    $.ae2karas.addTemp(helperSequenceComp);

    let item = app.project.renderQueue.items.add(helperSequenceComp);
    $.ae2karas.addTemp(item);

    let outputModule = item.outputModule(1);
    outputModule.applyTemplate("_HIDDEN X-Factor 8 Premul");
    let fileName = path + name;
    let file = new File(fileName);
    if(file.exists) {
      file.remove();
    }
    outputModule.file = new File(fileName);

    item.onStatusChanged = function() {
      // 完成后要重命名，因为ae会追加00000到文件名末尾
      if(item.status === RQItemStatus.DONE) {
        let bug = new File(fileName + '00000');
        if(bug.exists) {
          bug.rename(name);
        }
      }
    };
    app.project.renderQueue.render();
  },
};
