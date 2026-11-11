// Character tables of Rescue Team DX's rescue passwords, from pmd-gen
// (https://github.com/Karthik99999/pmd-gen, MIT), which took them from the game.

/**
 * Team names are stored as 9-bit indexes into this table. Index 0 marks the end of the name,
 * so the table starts at index 1.
 */
export const TEXT_CHARS: readonly string[] = ['', ..."ぁあぃいぅうぇえぉおかがきぎくぐけげこごさざしじすずせぜそぞただちぢっつづてでとどなにぬねのはばぱひびぴふぶぷへべぺほぼぽまみむめもゃやゅゆょよらりるれろゎわをん゛゜ァアィイゥウェエォオカガキギクグケゲコゴサザシジスズセゼソゾタダチヂッツヅテデトドナニヌネノハバパヒビピフブプヘベペホボポマミムメモャヤュユョヨラリルレロヮワヲンヴ・ー～／（）『』※♪♂♀！？　☆★○●◇◆□■△▽▲▼,.!¡?¿‘’“”abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890@&-_#$%:;*+<=> àáâãäåæçèéêëìíîïðñòóôõöøœšþùúûüýÿž…ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØŒŠÞÙÚÛÜÝŸŽßＡＢＣＤＥＦＧＨＩＪＫＬＭＮＯＰＱＲＳＴＵＶＷＸＹＺａｂｃｄｅｆｇｈｉｊｋｌｍｎｏｐｑｒｓｔｕｖｗｘｙｚ"];

/**
 * The 64 password symbols as characters. The revival key of a rescue request is the CRC-32 of
 * its symbols written with these characters.
 */
export const SYMBOL_CHARS = 'abdefghijkmnpqrtuyABCDEFGHJKLMNPQRSTUVWXYZ1234567890★▲◆&$%*+=<>:';
