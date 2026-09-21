import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createCipheriv } from "node:crypto";
import path from "node:path";
import assert from "node:assert/strict";
import { sha } from "./fifo-candidates.ts";
import type { FamilyConfig } from "./family-preparation.ts";

// Reproducible evaluator fixtures; never modifies the seven upstream trees.
const out = path.resolve("tools", "mutation", "fixtures", "uart-aes");
await mkdir(out, { recursive: true });
const vectors = [
  ["000102030405060708090a0b0c0d0e0f", "00112233445566778899aabbccddeeff"],
  ["2b7e151628aed2a6abf7158809cf4f3c", "3243f6a8885a308d313198a2e0370734"],
  ["00000000000000000000000000000000", "00000000000000000000000000000000"],
  ...Array.from({ length: 13 }, (_, i) => [
    sha(`aes-key-${i}`).slice(0, 32),
    sha(`aes-text-${i}`).slice(0, 32),
  ]),
].map(([key, plaintext]) => {
  const cipher = createCipheriv("aes-128-ecb", Buffer.from(key!, "hex"), null);
  cipher.setAutoPadding(false);
  return {
    key: key!,
    plaintext: plaintext!,
    ciphertext: Buffer.concat([
      cipher.update(Buffer.from(plaintext!, "hex")),
      cipher.final(),
    ]).toString("hex"),
  };
});
assert.equal(vectors[0]!.ciphertext, "69c4e0d86a7b0430d8cdb78070b4c55a");
assert.equal(vectors[1]!.ciphertext, "3925841d02dc09fbdc118597196a0b32");
await writeFile(
  path.join(out, "aes-vectors.json"),
  JSON.stringify(
    {
      reference:
        "FIPS-197 two known answers cross-check Node/OpenSSL AES-128-ECB; remaining fixed SHA-derived inputs",
      vectors,
    },
    null,
    2,
  ) + "\n",
);
const header =
  '`timescale 1ns/1ps\nmodule tb;\nreg clk=0; always #5 clk=~clk;\ninitial begin #2000000; $fatal(1, "GLOBAL_TIMEOUT"); end\n';
const aesArrays = `reg [127:0] keys[0:15], plains[0:15], expected[0:15];
initial begin
${vectors.map((v, i) => `keys[${i}]=128'h${v.key}; plains[${i}]=128'h${v.plaintext}; expected[${i}]=128'h${v.ciphertext};`).join("\n")}
end
`;
const aesCore = `${header}${aesArrays}
reg rst=0,ld=0; reg[127:0] key=0,text_in=0; wire done; wire[127:0] text_out;
aes_cipher_top dut(.clk(clk),.rst(rst),.ld(ld),.done(done),.key(key),.text_in(text_in),.text_out(text_out));
integer i,n;
initial begin
 repeat(5) @(negedge clk); rst=1;
 for(i=0;i<16;i=i+1) begin
  @(negedge clk); key=keys[i]; text_in=plains[i]; ld=1;
  @(negedge clk); ld=0; n=0;
  while(done!==1'b1 && n<40) begin @(negedge clk); n=n+1; end
  if(done!==1'b1) $fatal(1,"AES_TIMEOUT %0d",i);
  if(text_out!==expected[i]) $fatal(1,"AES_DATA %0d expected=%h got=%h",i,expected[i],text_out);
  @(negedge clk);
  if(i==7) begin rst=0; repeat(3) @(negedge clk); rst=1; end
 end
 $display("IP_PREPARATION_PASS aes-core checks=16"); $finish;
end
endmodule
`;
const tinyAes = `${header}${aesArrays}
reg[127:0] key=0,state=0; wire[127:0] out;
aes_128 dut(.clk(clk),.state(state),.key(key),.out(out));
integer cycle=0,checked=0;
// Upstream aes_128 has a 21-edge pipeline and no reset/valid port.
initial begin
 @(negedge clk);
 for(cycle=0;cycle<37;cycle=cycle+1) begin
  if(cycle<16) begin key=keys[cycle]; state=plains[cycle]; end
  else begin key=0; state=0; end
  @(posedge clk); #2;
  if(cycle>=20 && cycle<36) begin
   if(out!==expected[cycle-20]) $fatal(1,"AES_DATA %0d expected=%h got=%h",cycle-20,expected[cycle-20],out);
   checked=checked+1;
  end
  @(negedge clk);
 end
 if(checked!=16) $fatal(1,"AES_COUNT");
 $display("IP_PREPARATION_PASS tiny-aes checks=16"); $finish;
end
endmodule
`;
const pipeAes = `${header}${aesArrays}
reg reset=0,data_valid_in=0,cipherkey_valid_in=0;
reg[127:0] cipher_key=0,plain_text=0; wire valid_out; wire[127:0] cipher_text;
Top_PipelinedCipher #(.DATA_W(128),.KEY_L(128),.NO_ROUNDS(10)) dut(.*);
integer sent=0,checked=0,cycle;
always @(negedge clk) if(reset && valid_out) begin
 if(checked>=sent) $fatal(1,"AES_UNEXPECTED_OUTPUT");
 if(cipher_text!==expected[checked]) $fatal(1,"AES_DATA %0d expected=%h got=%h",checked,expected[checked],cipher_text);
 checked=checked+1;
end
initial begin
 repeat(5) @(negedge clk); #1; reset=1;
 for(cycle=0;cycle<20;cycle=cycle+1) begin
  @(negedge clk); #1;
  if(cycle%5!=4) begin
   cipher_key=keys[sent]; plain_text=plains[sent]; data_valid_in=1; cipherkey_valid_in=1; sent=sent+1;
  end else begin data_valid_in=0; cipherkey_valid_in=0; end
 end
 @(negedge clk); #1; data_valid_in=0; cipherkey_valid_in=0;
 repeat(100) @(negedge clk);
 if(checked!=16) $fatal(1,"AES_COUNT %0d",checked);
 $display("IP_PREPARATION_PASS aes-pipeline checks=16"); $finish;
end
endmodule
`;
const uartCommon = (period: number, stop: number) => `${header}
localparam integer BIT_CYCLES=${period}, STOP_BITS=${stop};
reg rst=1, rx=1; wire tx;
reg[7:0] patterns[0:7];
integer tx_count=0,rx_count=0,checks=0;
initial begin patterns[0]=8'h00; patterns[1]=8'hff; patterns[2]=8'h55; patterns[3]=8'haa;
 patterns[4]=8'h81; patterns[5]=8'h7e; patterns[6]=8'h13; patterns[7]=8'hc4; end
task automatic ticks(input integer n); repeat(n) @(negedge clk); endtask
task automatic send_rx(input [7:0] value);
 integer bitn;
 begin
  @(negedge clk); rx=0; ticks(BIT_CYCLES);
  for(bitn=0;bitn<8;bitn=bitn+1) begin rx=value[bitn]; ticks(BIT_CYCLES); end
  rx=1; ticks(BIT_CYCLES*STOP_BITS); ticks(BIT_CYCLES);
 end
endtask
// Independent serial decoder: do not use internal DUT shift registers as oracle.
initial begin : tx_monitor
 reg[7:0] decoded; integer bitn;
 wait(!rst);
 forever begin
  @(negedge tx); ticks(BIT_CYCLES/2);
  if(tx!==0) $fatal(1,"TX_START");
  for(bitn=0;bitn<8;bitn=bitn+1) begin ticks(BIT_CYCLES); decoded[bitn]=tx; end
  for(bitn=0;bitn<STOP_BITS;bitn=bitn+1) begin ticks(BIT_CYCLES); if(tx!==1) $fatal(1,"TX_STOP"); end
  if(tx_count>=8 || decoded!==patterns[tx_count]) $fatal(1,"TX_DATA index=%0d got=%h",tx_count,decoded);
  tx_count=tx_count+1;
 end
end
`;
function byteUart(id: "osdvu" | "uart2bus") {
  const os = id === "osdvu";
  const instance = os
    ? `wire received,is_receiving,is_transmitting,recv_error; wire[7:0] rx_byte;
uart #(.CLOCK_DIVIDE(4)) dut(.clk(clk),.rst(rst),.rx(rx),.tx(tx),.transmit(push),.tx_byte(data),.received(received),.rx_byte(rx_byte),.is_receiving(is_receiving),.is_transmitting(is_transmitting),.recv_error(recv_error));
wire busy=is_transmitting; wire valid=received; wire[7:0] received_data=rx_byte;`
    : `wire busy,valid,baud_clk; wire[7:0] received_data;
uart_top dut(.clock(clk),.reset(rst),.ser_in(rx),.ser_out(tx),.rx_data(received_data),.new_rx_data(valid),.tx_data(data),.new_tx_data(push),.tx_busy(busy),.baud_freq(12'd1),.baud_limit(16'd3),.baud_clk(baud_clk));`;
  return `${uartCommon(os ? 16 : 64, os ? 2 : 1)}reg push=0; reg[7:0] data=0;
${instance}
always @(negedge clk) if(!rst && valid) begin
 if(rx_count>=8 || received_data!==patterns[rx_count]) $fatal(1,"RX_DATA index=%0d got=%h",rx_count,received_data);
 rx_count=rx_count+1;
end
integer i,n;
initial begin
 ticks(8); rst=0; ticks(BIT_CYCLES*3);
 for(i=0;i<8;i=i+1) begin
  n=0; while(busy && n<BIT_CYCLES*20) begin ticks(1); n=n+1; end
  if(busy) $fatal(1,"TX_BUSY_TIMEOUT");
  @(negedge clk); data=patterns[i]; push=1; ticks(1); push=0;
  send_rx(patterns[i]); ticks(BIT_CYCLES*3);
 end
 ticks(BIT_CYCLES*15);
 if(tx_count!=8 || rx_count!=8) $fatal(1,"UART_COUNTS tx=%0d rx=%0d",tx_count,rx_count);
 $display("IP_PREPARATION_PASS ${id} tx=8 rx=8"); $finish;
end
endmodule
`;
}
const wbUart = `${uartCommon(32, 1)}
reg cyc=0,stb=0,we=0; reg[1:0] addr=0; reg[31:0] wdata=0; wire[31:0] rdata; wire ack,stall,rx_int;
wbuart #(.INITIAL_SETUP(31'd32),.LGFLEN(4),.HARDWARE_FLOW_CONTROL_PRESENT(0)) dut(
 .i_clk(clk),.i_reset(rst),.i_wb_cyc(cyc),.i_wb_stb(stb),.i_wb_we(we),.i_wb_addr(addr),.i_wb_data(wdata),.i_wb_sel(4'hf),
 .o_wb_stall(stall),.o_wb_ack(ack),.o_wb_data(rdata),.i_uart_rx(rx),.o_uart_tx(tx),.i_cts_n(1'b0),.o_uart_rx_int(rx_int));
task automatic bus(input bit wr,input[1:0] a,input[31:0] d,output[31:0] q);
 integer n; begin
  @(negedge clk); cyc=1; stb=1; we=wr; addr=a; wdata=d;
  @(negedge clk); stb=0; n=0;
  while(!ack && n<16) begin @(negedge clk); n=n+1; end
  if(!ack || stall) $fatal(1,"WB_ACK"); q=rdata;
  @(negedge clk); cyc=0; we=0; ticks(3);
 end
endtask
integer i,n; reg[31:0] q;
initial begin
 ticks(8); rst=0; ticks(BIT_CYCLES*16);
 bus(0,0,0,q); if(q!==32'h40000020) $fatal(1,"WB_SETUP %h",q);
 for(i=0;i<8;i=i+1) begin
  bus(1,3,{24'd0,patterns[i]},q);
  send_rx(patterns[i]); n=0;
  while(!rx_int && n<BIT_CYCLES*12) begin ticks(1); n=n+1; end
  if(!rx_int) $fatal(1,"RX_TIMEOUT");
  bus(0,2,0,q);
  if(q[7:0]!==patterns[i] || q[8]!==0) $fatal(1,"RX_DATA %0d %h",i,q);
  rx_count=rx_count+1; ticks(BIT_CYCLES*4);
 end
 ticks(BIT_CYCLES*15);
 if(tx_count!=8 || rx_count!=8) $fatal(1,"UART_COUNTS");
 $display("IP_PREPARATION_PASS wbuart32 tx=8 rx=8"); $finish;
end
endmodule
`;
const uart16550 = `${uartCommon(32, 1)}
reg cyc=0,stb=0,we=0; reg[2:0] addr=0; reg[7:0] wdata=0; wire[7:0] rdata; wire ack;
uart_top dut(.wb_clk_i(clk),.wb_rst_i(rst),.wb_adr_i(addr),.wb_dat_i(wdata),.wb_dat_o(rdata),.wb_we_i(we),.wb_stb_i(stb),.wb_cyc_i(cyc),.wb_ack_o(ack),.wb_sel_i(4'h1),.srx_pad_i(rx),.stx_pad_o(tx),.cts_pad_i(1'b0),.dsr_pad_i(1'b0),.ri_pad_i(1'b0),.dcd_pad_i(1'b0));
task automatic bus(input bit wr,input[2:0] a,input[7:0] d,output[7:0] q);
 integer n; begin
  @(negedge clk); cyc=1; stb=1; we=wr; addr=a; wdata=d; n=0;
  @(negedge clk);
  while(!ack && n<16) begin @(negedge clk); n=n+1; end
  if(!ack) $fatal(1,"WB_ACK"); q=rdata;
  cyc=0; stb=0; we=0; ticks(4);
 end
endtask
integer i,n; reg[7:0] q;
initial begin
 ticks(8); rst=0; ticks(8);
 bus(1,3,8'h83,q); bus(1,0,8'h02,q); bus(1,1,8'h00,q); bus(1,3,8'h03,q);
 bus(1,2,8'h07,q); bus(1,7,8'ha5,q); bus(0,7,0,q);
 if(q!==8'ha5) $fatal(1,"SCRATCH %h",q);
 ticks(BIT_CYCLES*3);
 for(i=0;i<8;i=i+1) begin
  bus(1,0,patterns[i],q); send_rx(patterns[i]);
  n=0; q=0; while(!q[0] && n<80) begin bus(0,5,0,q); n=n+1; end
  if(!q[0]) $fatal(1,"RX_TIMEOUT");
  if(q[4:1]!==0) $fatal(1,"RX_STATUS %h",q);
  bus(0,0,0,q); if(q!==patterns[i]) $fatal(1,"RX_DATA %0d %h",i,q);
  rx_count=rx_count+1; ticks(BIT_CYCLES*4);
 end
 ticks(BIT_CYCLES*15);
 if(tx_count!=8 || rx_count!=8) $fatal(1,"UART_COUNTS");
 $display("IP_PREPARATION_PASS uart16550 tx=8 rx=8"); $finish;
end
endmodule
`;

type Entry = {
  id: string;
  repo: string;
  revision: string;
  family: "uart" | "aes";
  module: string;
  files: string[];
  units: string[];
  dut: string;
  ranges: FamilyConfig["mutationFiles"];
  defines?: string[];
  license: string;
  licenseEvidence?: string[];
  spec: string;
  ancestry: string;
  tb: string;
};
const prefix = (p: string, names: string[]) => names.map((n) => `${p}/${n}.v`);
const uartFiles = prefix("rtl/verilog", [
  "uart_top",
  "uart_wb",
  "uart_regs",
  "uart_receiver",
  "uart_transmitter",
  "uart_rfifo",
  "uart_tfifo",
  "uart_sync_flops",
  "raminfr",
  "uart_debug_if",
  "uart_defines",
  "timescale",
]);
const aesFiles = prefix("rtl/verilog", [
  "aes_cipher_top",
  "aes_key_expand_128",
  "aes_rcon",
  "aes_sbox",
  "timescale",
]);
const pipeFiles = prefix("rtl", [
  "Top_PipelinedCipher",
  "SubBytes",
  "ShiftRows",
  "SBox",
  "RoundKeyGen",
  "Round",
  "MixColumns",
  "KeyExpantion",
  "AddRoundKey",
]);
const entries: Entry[] = [
  {
    id: "uart16550",
    repo: "freecores/uart16550",
    revision: "2b0ad80d0968f201f95506854ad769c8a44abe2b",
    family: "uart",
    module: "uart_top",
    files: uartFiles,
    units: uartFiles.filter((f) => !f.endsWith("defines.v") && !f.endsWith("timescale.v")),
    dut: "rtl/verilog/uart_top.v",
    ranges: {
      "rtl/verilog/uart_receiver.v": [
        [275, 282],
        [284, 285],
        [287, 312],
        [318, 333],
        [338, 357],
        [388, 430],
      ],
      "rtl/verilog/uart_transmitter.v": [
        [210, 218],
        [220, 240],
        [258, 288],
        [302, 307],
        [321, 325],
        [331, 338],
        [346, 346],
      ],
    },
    defines: ["DATA_BUS_WIDTH_8"],
    license: "LGPL-2.1-or-later (source headers)",
    spec: "8-bit Wishbone registers; 8N1; divisor 2 => 32 clocks/bit; 16-byte FIFOs; independent TX decoder and RX driver; scratch register check",
    ancestry:
      "Alex Gorban/Jacob Gorban 16550 implementation; no cross-repository independence proof",
    tb: uart16550,
  },
  {
    id: "wbuart32",
    repo: "ZipCPU/wbuart32",
    revision: "f43a6b83c3a70fb2ac0696a45c5545b233fb860b",
    family: "uart",
    module: "wbuart",
    files: prefix("rtl", ["wbuart", "rxuart", "txuart", "ufifo"]),
    units: prefix("rtl", ["wbuart", "rxuart", "txuart", "ufifo"]),
    dut: "rtl/wbuart.v",
    ranges: {
      "rtl/rxuart.v": [
        [174, 204],
        [216, 267],
        [298, 329],
        [337, 346],
        [349, 356],
        [377, 379],
        [438, 472],
        [477, 494],
        [503, 527],
      ],
      "rtl/txuart.v": [
        [206, 208],
        [213, 219],
        [225, 236],
        [240, 245],
        [272, 292],
        [315, 319],
        [321, 321],
        [405, 408],
        [413, 425],
        [438, 438],
      ],
    },
    license: "GPL-3.0-or-later",
    licenseEvidence: ["LICENSE"],
    spec: "Wishbone pipelined single-beat; INITIAL_SETUP=32, LGFLEN=4, HARDWARE_FLOW_CONTROL_PRESENT=0; 8N1; 32 clocks/bit; serial TX/RX checks",
    ancestry:
      "Contains ufifo used in existing FIFO family; do not treat families as code-disjoint; mutate UART engines only",
    tb: wbUart,
  },
  {
    id: "osdvu",
    repo: "freecores/osdvu",
    revision: "f955ae67f278de024b72288a4bdd9f0a985ed55b",
    family: "uart",
    module: "uart",
    files: ["uart.v"],
    units: ["uart.v"],
    dut: "uart.v",
    ranges: { "uart.v": [[85, 225]] },
    license: "MIT (full source header)",
    spec: "CLOCK_DIVIDE=4; 16 clocks/bit; 8 data bits, TX two stop bits; native byte handshake and RX status; no inferred parity support",
    ancestry: "Timothy Goddard documented UART; full ancestry comparison pending",
    tb: byteUart("osdvu"),
  },
  {
    id: "uart2bus-uart",
    repo: "freecores/uart2bus",
    revision: "f85211ec749895de51a3eaaff620b17c00a5f41a",
    family: "uart",
    module: "uart_top",
    files: prefix("verilog/rtl", ["uart_top", "uart_tx", "uart_rx", "baud_gen"]),
    units: prefix("verilog/rtl", ["uart_top", "uart_tx", "uart_rx", "baud_gen"]),
    dut: "verilog/rtl/uart_top.v",
    ranges: {
      "verilog/rtl/uart_tx.v": [[30, 110]],
      "verilog/rtl/uart_rx.v": [[35, 135]],
      "verilog/rtl/baud_gen.v": [[35, 65]],
    },
    license: "BSD (OpenCores project metadata; variant not specified)",
    spec: "UART engine only, no parser/bus bridge; baud_freq=1, baud_limit=3 => 64 clocks/bit; 8N1; native byte handshake",
    ancestry:
      "UART interface derived from OpenCores c16 per upstream specification; wrapper/parser excluded; full ancestry comparison pending",
    tb: byteUart("uart2bus"),
  },
  {
    id: "aes-core",
    repo: "freecores/aes_core",
    revision: "0d81d6e0758c634c8db7c8348d7653fa20c58639",
    family: "aes",
    module: "aes_cipher_top",
    files: aesFiles,
    units: aesFiles.filter((f) => !f.endsWith("timescale.v")),
    dut: "rtl/verilog/aes_cipher_top.v",
    ranges: {
      "rtl/verilog/aes_cipher_top.v": [[102, 290]],
      "rtl/verilog/aes_key_expand_128.v": [[69, 80]],
    },
    license: "Source-header permission with notice/disclaimer retention (Rudolf Usselmann)",
    spec: "AES-128 encryption; synchronous active-low reset; pulse ld, wait bounded done; 16 fixed vectors, reset between vector groups",
    ancestry:
      "Rudolf Usselmann iterative implementation; shared AES algorithm is not independent ancestry evidence",
    tb: aesCore,
  },
  {
    id: "tiny-aes",
    repo: "freecores/tiny_aes",
    revision: "faf2afb2bcb6c3247c00d6bd7129b31b4fff91fb",
    family: "aes",
    module: "aes_128",
    files: prefix("rtl", ["aes_128", "round", "table"]),
    units: prefix("rtl", ["aes_128", "round", "table"]),
    dut: "rtl/aes_128.v",
    ranges: { "rtl/aes_128.v": [[25, 103]], "rtl/round.v": [[18, 82]] },
    license: "Apache-2.0",
    licenseEvidence: ["LICENSE"],
    spec: "AES-128 encryption; no reset/valid; 21-edge fixed pipeline; 16 back-to-back blocks with independently computed expected output",
    ancestry:
      "Homer Hsing pipelined table-based implementation; compare with existing AES before assigning roles",
    tb: tinyAes,
  },
  {
    id: "aes-pipeline",
    repo: "freecores/aes-128_pipelined_encryption",
    revision: "c503d0d12d9c45d543fe958590c10193d1b95162",
    family: "aes",
    module: "Top_PipelinedCipher",
    files: pipeFiles,
    units: pipeFiles,
    dut: "rtl/Top_PipelinedCipher.v",
    ranges: {
      "rtl/Top_PipelinedCipher.v": [[75, 94]],
      "rtl/AddRoundKey.v": [[30, 100]],
      "rtl/MixColumns.v": [[30, 210]],
      "rtl/RoundKeyGen.v": [[35, 210]],
    },
    license: "LGPL (OpenCores project metadata; version not specified)",
    spec: "AES-128 encryption; DATA_W=KEY_L=128, NO_ROUNDS=10; asynchronous active-low reset; paired data/key valid, bubbles, 16 ordered outputs",
    ancestry: "Amr Salah four-stage-per-round pipeline; no independent ancestry claim yet",
    tb: pipeAes,
  },
];
for (const entry of entries) {
  const directory = entry.repo.split("/")[1]!;
  const root = `.rtl-agent/datasets/verification-transfer/${directory}`;
  const files: Record<string, string> = {};
  for (const file of entry.files)
    files[file] = sha(await readFile(path.resolve(root, ...file.split("/"))));
  const tb = `tools/mutation/fixtures/uart-aes/${entry.id}-golden-tb.sv`;
  const config: FamilyConfig = {
    id: entry.id,
    family: entry.family,
    role: "unassigned",
    root,
    module: entry.module,
    revision: entry.revision,
    reference: `https://github.com/${entry.repo}`,
    license: entry.license,
    licenseEvidence: entry.licenseEvidence ?? [],
    files,
    units: entry.units,
    dut: entry.dut,
    tb,
    defines: entry.defines ?? [],
    mutationFiles: entry.ranges,
    specification: entry.spec,
    ancestry: entry.ancestry,
    policyVersion: 2,
  };
  if (entry.id === "uart16550")
    config.excludedMutations = [
      {
        file: "rtl/verilog/uart_receiver.v",
        line: 280,
        operator: "bit_constant",
        reason: "rbit_in has only a declaration and reset assignment; it has no consumers",
      },
      {
        file: "rtl/verilog/uart_receiver.v",
        line: 284,
        operator: "bit_constant",
        reason: "Reset framing flag is overwritten by stop-bit sampling before a FIFO push",
      },
      {
        file: "rtl/verilog/uart_transmitter.v",
        line: 218,
        operator: "bit_constant",
        reason:
          "Reset bit_out is overwritten by the FIFO byte before transmission; not an observable fixed-configuration fault",
      },
      {
        file: "rtl/verilog/uart_receiver.v",
        line: 285,
        operator: "bit_constant",
        reason:
          "Reset parity error is cleared by the 8N1 end-bit path before the first received byte",
      },
      {
        file: "rtl/verilog/uart_receiver.v",
        line: 425,
        operator: "reset_offset",
        reason: "Delayed push reset value is masked by rf_push=0 and overwritten before any push",
      },
      {
        file: "rtl/verilog/uart_receiver.v",
        line: 307,
        operator: "bit_constant",
        reason:
          "Flipping the compared one-bit constant duplicates the equality-to-inequality operator at this site",
      },
      {
        file: "rtl/verilog/uart_receiver.v",
        line: 299,
        operator: "bit_constant",
        reason:
          "Flipping the compared one-bit constant duplicates the equality-to-inequality operator at this site",
      },
    ];
  if (entry.id === "wbuart32")
    config.excludedMutations = [
      {
        file: "rtl/txuart.v",
        line: 292,
        operator: "bit_constant",
        reason:
          "Shift-register fill bit arrives after the eight transmitted data bits and is not observed in 8N1",
      },
      {
        file: "rtl/rxuart.v",
        line: 253,
        operator: "bit_constant",
        reason:
          "Reset half_baud_time is ignored in RXU_RESET_IDLE and recomputed before transition to receive state",
      },
    ];
  await writeFile(path.resolve(tb), entry.tb);
  await writeFile(path.join(out, `${entry.id}.json`), JSON.stringify(config, null, 2) + "\n");
}
process.stdout.write(
  JSON.stringify({ fixtures: entries.map((e) => e.id), aesVectors: vectors.length }) + "\n",
);
